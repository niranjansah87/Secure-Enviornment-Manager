"""
Flask-SocketIO WebSocket Integration
Provides real-time bidirectional communication for:
- Secret change notifications
- Audit event streaming
- Session management
- Multi-device sync

Requires: flask-socketio, python-socketio, eventlet
"""
import logging
from datetime import datetime, timezone
from functools import wraps

from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask import request, g

logger = logging.getLogger(__name__)

# Global SocketIO instance - initialized in app.py
socketio = None


def init_websocket(app):
    """Initialize WebSocket support with Flask app."""
    global socketio

    socketio = SocketIO(
        app,
        cors_allowed_origins="*",  # CORS handled by Nginx
        async_mode='eventlet',
        ping_timeout=60,
        ping_interval=25,
        max_http_buffer_size=10 * 1024 * 1024,  # 10MB
        message_queue=None,  # Local-only, no Redis
        channel='sem_events',
    )

    _register_handlers(socketio)
    logger.info("WebSocket support initialized")
    return socketio


def _register_handlers(sio):
    """Register WebSocket event handlers."""

    @sio.on('connect')
    def handle_connect():
        """Handle new WebSocket connection with JWT authentication."""
        # Extract token from handshake query string or headers
        token = request.args.get('token') or request.headers.get('Authorization', '').replace('Bearer ', '')

        if not token:
            logger.warning(f"WebSocket connect rejected: no token provided")
            disconnect()
            return False

        # Validate token
        from core.jwt_auth import token_manager
        payload = token_manager.validate_access_token(token)

        if not payload:
            logger.warning(f"WebSocket connect rejected: invalid token")
            disconnect()
            return False

        # Store identity in connection session
        request.environ['session_id'] = payload.sub
        request.environ['namespace'] = payload.namespace or 'global'
        request.environ['environment'] = payload.environment or 'main'
        request.environ['is_admin'] = payload.is_admin

        # Join namespace:environment room
        room_id = f"{payload.namespace or 'global'}:{payload.environment or 'main'}"
        join_room(room_id)

        logger.info(f"WebSocket connected: session={payload.sub[:16]} room={room_id}")

        emit('connected', {
            'session_id': payload.sub,
            'room': room_id,
            'namespace': payload.namespace,
            'environment': payload.environment,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })

        return True

    @sio.on('disconnect')
    def handle_disconnect():
        """Handle WebSocket disconnection."""
        session_id = request.environ.get('session_id', 'unknown')[:16]
        room_id = f"{request.environ.get('namespace', 'global')}:{request.environ.get('environment', 'main')}"
        leave_room(room_id)
        logger.info(f"WebSocket disconnected: session={session_id} room={room_id}")

    @sio.on('subscribe')
    def handle_subscribe(data):
        """Subscribe to specific namespace:environment room.

        Accepts both parameter naming conventions:
        - namespace/environment (web standard)
        - namespace_id/environment_id (Flutter convention)
        """
        namespace = data.get('namespace') or data.get('namespace_id', request.environ.get('namespace', 'global'))
        environment = data.get('environment') or data.get('environment_id', request.environ.get('environment', 'main'))

        room_id = f"{namespace}:{environment}"
        join_room(room_id)

        logger.info(f"WebSocket subscribed to room: {room_id}")
        emit('subscribed', {
            'room': room_id,
            'namespace': namespace,
            'environment': environment,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })

    @sio.on('unsubscribe')
    def handle_unsubscribe(data):
        """Unsubscribe from specific room."""
        room_id = data.get('room')
        if room_id:
            leave_room(room_id)
            logger.info(f"WebSocket unsubscribed from room: {room_id}")
            emit('unsubscribed', {'room': room_id})

    @sio.on('subscribe_all')
    def handle_subscribe_all(data):
        """Subscribe to all rooms user has access to (admin only)."""
        if not request.environ.get('is_admin', False):
            emit('error', {'message': 'Admin access required'})
            return

        from core.sessions import get_active_sessions
        sessions = get_active_sessions()

        for session in sessions:
            namespace = session.get('namespace', 'global')
            environment = session.get('environment', 'main')
            room_id = f"{namespace}:{environment}"
            join_room(room_id)

        emit('subscribed_all', {
            'rooms_count': len(sessions),
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })

    @sio.on('ping')
    def handle_ping():
        """Handle client ping - respond with pong."""
        emit('pong', {'timestamp': datetime.now(timezone.utc).isoformat()})


def broadcast_secret_change(namespace: str, environment: str, action: str, key: str = None, count: int = None):
    """Broadcast secret change event to all subscribed clients."""
    if socketio is None:
        return

    room_id = f"{namespace}:{environment}"
    event_data = {
        'namespace': namespace,
        'environment': environment,
        'action': action,  # created, updated, deleted, bulk_update
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }
    if key:
        event_data['key'] = key
    if count is not None:
        event_data['count'] = count

    event_map = {
        'created': 'secret:created',
        'updated': 'secret:updated',
        'deleted': 'secret:deleted',
        'bulk_update': 'secret:bulk_update',
    }
    event_name = event_map.get(action, 'secret:updated')

    socketio.emit(event_name, event_data, room=room_id)
    logger.debug(f"Secret change broadcast: room={room_id} event={event_name}")


def broadcast_audit_event(namespace: str, environment: str, event_data: dict):
    """Broadcast audit event to all subscribed clients."""
    if socketio is None:
        return

    room_id = f"{namespace}:{environment}"
    event_data['namespace'] = namespace
    event_data['environment'] = environment
    event_data['timestamp'] = datetime.now(timezone.utc).isoformat()

    socketio.emit('audit:event', event_data, room=room_id)
    logger.debug(f"Audit event broadcast: room={room_id}")


def broadcast_session_revoked(session_id: str):
    """Notify connected clients when their session is revoked."""
    if socketio is None:
        return

    # Find all rooms and broadcast to them - session revocation affects all
    # In a production system with Redis, you'd track session->room mapping
    socketio.emit('session:revoked', {
        'session_id': session_id,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"Session revoked broadcast: session={session_id[:16]}")


def broadcast_device_revoked(device_id: str, session_id: str):
    """Notify connected clients when a device is revoked."""
    if socketio is None:
        return

    # Broadcast to all rooms - the client will handle filtering
    socketio.emit('device:revoked', {
        'device_id': device_id,
        'session_id': session_id,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"Device revoked broadcast: device={device_id[:16]}")


def get_connected_clients_count() -> int:
    """Get count of currently connected WebSocket clients."""
    if socketio is None:
        return 0

    # This is an approximation - SocketIO doesn't expose direct client count
    # In production with Redis adapter, use: socketio.manager.engine.eio.clients
    return 0