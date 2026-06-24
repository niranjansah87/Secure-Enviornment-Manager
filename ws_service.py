"""
WebSocket service for real-time updates.
Provides bidirectional communication for:
- Secret change notifications
- Audit event streaming
- Session revocation events
- Multi-device sync

Note: This is a scaffolding implementation. For production:
- Use flask-socketio or similar with proper async mode
- Configure Redis adapter for horizontal scaling
- Add proper authentication middleware
"""
import json
import logging
from datetime import datetime, timezone
from enum import Enum
from threading import Lock
from typing import Callable, Set

import jwt


logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """WebSocket event types."""
    SECRET_CREATED = "secret:created"
    SECRET_UPDATED = "secret:updated"
    SECRET_DELETED = "secret:deleted"
    SECRET_BULK_UPDATE = "secret:bulk_update"
    AUDIT_EVENT = "audit:event"
    SESSION_REVOKED = "session:revoked"
    DEVICE_REVOKED = "device:revoked"
    HEARTBEAT = "heartbeat"
    ERROR = "error"


class Room:
    """Represents a subscription room for broadcasting."""

    def __init__(self, room_id: str):
        self.room_id = room_id
        self.connections: Set['WebSocketConnection'] = set()
        self._lock = Lock()

    def add(self, conn: 'WebSocketConnection') -> None:
        with self._lock:
            self.connections.add(conn)

    def remove(self, conn: 'WebSocketConnection') -> None:
        with self._lock:
            self.connections.discard(conn)

    def broadcast(self, event: str, data: dict) -> None:
        """Broadcast message to all connections in room."""
        message = json.dumps({
            "event": event,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        with self._lock:
            dead_connections = set()
            for conn in self.connections:
                try:
                    conn.send(message)
                except Exception:
                    dead_connections.add(conn)
            # Clean up dead connections
            self.connections -= dead_connections


class WebSocketConnection:
    """Represents a WebSocket connection."""

    def __init__(self, conn_id: str, session_id: str, namespace: str = None, environment: str = None):
        self.conn_id = conn_id
        self.session_id = session_id
        self.namespace = namespace
        self.environment = environment
        self.rooms: Set[str] = set()
        self._last_heartbeat = datetime.now(timezone.utc)
        self._lock = Lock()

    def send(self, message: str) -> None:
        """Send message to this connection."""
        raise NotImplementedError("Subclass must implement send()")

    def is_alive(self) -> bool:
        """Check if connection is still alive based on heartbeat."""
        # Simple heartbeat check - connection is alive if seen recently
        from datetime import timedelta
        return datetime.now(timezone.utc) - self._last_heartbeat < timedelta(minutes=5)

    def update_heartbeat(self) -> None:
        """Update last heartbeat timestamp."""
        with self._lock:
            self._last_heartbeat = datetime.now(timezone.utc)


class WebSocketService:
    """Manages WebSocket connections and message broadcasting.

    This is a scaffold - integrate with flask-socketio for production.
    """

    def __init__(self):
        self._connections: dict[str, WebSocketConnection] = {}
        self._rooms: dict[str, Room] = {}
        self._lock = Lock()
        self._event_handlers: dict[str, Callable] = {}
        self._heartbeat_interval = 30  # seconds

    def register_connection(self, conn: WebSocketConnection) -> None:
        """Register a new WebSocket connection."""
        with self._lock:
            self._connections[conn.conn_id] = conn
        logger.info(f"WebSocket connection registered: {conn.conn_id}")

    def unregister_connection(self, conn_id: str) -> None:
        """Unregister a WebSocket connection."""
        with self._lock:
            conn = self._connections.pop(conn_id, None)
            if conn:
                for room_id in conn.rooms:
                    if room_id in self._rooms:
                        self._rooms[room_id].remove(conn)
        logger.info(f"WebSocket connection unregistered: {conn_id}")

    def join_room(self, conn_id: str, room_id: str) -> bool:
        """Join a room."""
        with self._lock:
            conn = self._connections.get(conn_id)
            if not conn:
                return False

            if room_id not in self._rooms:
                self._rooms[room_id] = Room(room_id)

            self._rooms[room_id].add(conn)
            conn.rooms.add(room_id)
            return True

    def leave_room(self, conn_id: str, room_id: str) -> bool:
        """Leave a room."""
        with self._lock:
            conn = self._connections.get(conn_id)
            if not conn or room_id not in self._rooms:
                return False

            self._rooms[room_id].remove(conn)
            conn.rooms.discard(room_id)
            return True

    def leave_all_rooms(self, conn_id: str) -> None:
        """Leave all rooms for a connection."""
        with self._lock:
            conn = self._connections.get(conn_id)
            if not conn:
                return

            for room_id in list(conn.rooms):
                if room_id in self._rooms:
                    self._rooms[room_id].remove(conn)
            conn.rooms.clear()

    def broadcast_to_room(self, room_id: str, event: str, data: dict) -> int:
        """Broadcast message to all connections in a room.

        Returns:
            Number of connections that received the message
        """
        if room_id not in self._rooms:
            return 0

        room = self._rooms[room_id]
        with room._lock:
            count = len(room.connections)

        room.broadcast(event, data)
        logger.debug(f"Broadcast to room {room_id}: {event}")

        return count

    def broadcast_to_namespace(self, namespace: str, event: str, data: dict) -> int:
        """Broadcast to all connections in a namespace.

        This sends to all environments within the namespace.
        """
        count = 0
        # Wildcard pattern for all environments in namespace
        pattern = f"{namespace}:*"
        for room_id, room in self._rooms.items():
            if room_id.startswith(f"{namespace}:"):
                room.broadcast(event, data)
                with room._lock:
                    count += len(room.connections)
        return count

    def send_to_connection(self, conn_id: str, event: str, data: dict) -> bool:
        """Send message to a specific connection.

        Returns:
            True if sent, False if connection not found
        """
        conn = self._connections.get(conn_id)
        if not conn:
            return False

        message = json.dumps({
            "event": event,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        try:
            conn.send(message)
            return True
        except Exception:
            self.unregister_connection(conn_id)
            return False

    def notify_secret_change(
        self,
        namespace: str,
        environment: str,
        action: str,  # created, updated, deleted, bulk_update
        key: str = None,
        count: int = None
    ) -> None:
        """Notify connected clients of secret changes."""
        room_id = f"{namespace}:{environment}"
        data = {
            "namespace": namespace,
            "environment": environment,
            "action": action,
        }
        if key:
            data["key"] = key
        if count is not None:
            data["count"] = count

        event_map = {
            "created": EventType.SECRET_CREATED,
            "updated": EventType.SECRET_UPDATED,
            "deleted": EventType.SECRET_DELETED,
            "bulk_update": EventType.SECRET_BULK_UPDATE,
        }
        event = event_map.get(action, EventType.SECRET_UPDATED)

        self.broadcast_to_room(room_id, event.value, data)

    def notify_audit_event(self, namespace: str, environment: str, event_data: dict) -> None:
        """Notify connected clients of audit events."""
        room_id = f"{namespace}:{environment}"
        self.broadcast_to_room(room_id, EventType.AUDIT_EVENT.value, {
            "namespace": namespace,
            "environment": environment,
            **event_data
        })

    def notify_session_revoked(self, session_id: str) -> None:
        """Notify connection if its session is revoked."""
        with self._lock:
            for conn in self._connections.values():
                if conn.session_id == session_id:
                    try:
                        conn.send(json.dumps({
                            "event": EventType.SESSION_REVOKED.value,
                            "data": {"session_id": session_id},
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }))
                    except Exception:
                        pass

    def cleanup_stale_connections(self) -> int:
        """Remove connections with invalid sessions.

        Returns:
            Number of connections cleaned up
        """
        cleaned = 0
        with self._lock:
            dead_conn_ids = []
            for conn_id, conn in self._connections.items():
                if not conn.is_alive():
                    dead_conn_ids.append(conn_id)

            for conn_id in dead_conn_ids:
                self.unregister_connection(conn_id)
                cleaned += 1

        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} stale WebSocket connections")

        return cleaned


# Global WebSocket service instance
ws_service = WebSocketService()


# Flask-SocketIO integration scaffold
# Uncomment and configure when flask-socketio is added to requirements
#
# from flask_socketio import SocketIO, join_room, leave_room, emit
#
# socketio = SocketIO(cors_allowed_origins="*", async_mode='gevent')
#
# @socketio.on('connect')
# def handle_connect():
#     # Extract token from handshake
#     token = request.args.get('token')
#     if not token:
#         return False  # Reject connection
#
#     from core.jwt_auth import token_manager
#     payload = token_manager.validate_access_token(token)
#     if not payload:
#         return False
#
#     # Register connection
#     conn = WebSocketConnection(
#         conn_id=request.sid,
#         session_id=payload.sub,
#         namespace=payload.namespace,
#         environment=payload.environment,
#     )
#     ws_service.register_connection(conn)
#     return True
#
# @socketio.on('disconnect')
# def handle_disconnect():
#     ws_service.unregister_connection(request.sid)
#
# @socketio.on('subscribe')
# def handle_subscribe(data):
#     namespace = data.get('namespace')
#     environment = data.get('environment')
#     if namespace and environment:
#         room_id = f"{namespace}:{environment}"
#         join_room(room_id)
#         ws_service.join_room(request.sid, room_id)
#         emit('subscribed', {'room': room_id})
#
# @socketio.on('unsubscribe')
# def handle_unsubscribe(data):
#     room_id = data.get('room')
#     if room_id:
#         leave_room(room_id)
#         ws_service.leave_room(request.sid, room_id)


# Event hooks for integration with existing code

def on_secret_change(namespace: str, environment: str, action: str, key: str = None, count: int = None):
    """Hook to call when secrets change - triggers WebSocket notifications."""
    ws_service.notify_secret_change(namespace, environment, action, key, count)


def on_audit_event(namespace: str, environment: str, event_data: dict):
    """Hook to call when audit events occur - triggers WebSocket notifications."""
    ws_service.notify_audit_event(namespace, environment, event_data)


def on_session_revoked(session_id: str):
    """Hook to call when session is revoked - notifies connected clients."""
    ws_service.notify_session_revoked(session_id)