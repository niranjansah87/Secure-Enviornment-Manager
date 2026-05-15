import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:sem_mobile/core/environment/env_config.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/core/security/security_service.dart';

/// WebSocket event types
enum WsEventType {
  secretCreated,
  secretUpdated,
  secretDeleted,
  sessionRevoked,
  environmentUpdated,
  connected,
  disconnected,
  error,
  ping,
  pong,
}

/// WebSocket event
class WsEvent {
  final WsEventType type;
  final String? namespaceId;
  final String? environmentId;
  final String? secretId;
  final Map<String, dynamic>? data;
  final DateTime timestamp;

  WsEvent({
    required this.type,
    this.namespaceId,
    this.environmentId,
    this.secretId,
    this.data,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  factory WsEvent.fromJson(Map<String, dynamic> json) {
    return WsEvent(
      type: _parseEventType(json['event'] as String?),
      namespaceId: json['namespace_id'] as String?,
      environmentId: json['environment_id'] as String?,
      secretId: json['secret_id'] as String?,
      data: json['data'] as Map<String, dynamic>?,
    );
  }

  static WsEventType _parseEventType(String? event) {
    switch (event) {
      case 'secret_created':
        return WsEventType.secretCreated;
      case 'secret_updated':
        return WsEventType.secretUpdated;
      case 'secret_deleted':
        return WsEventType.secretDeleted;
      case 'session_revoked':
        return WsEventType.sessionRevoked;
      case 'environment_updated':
        return WsEventType.environmentUpdated;
      case 'pong':
        return WsEventType.pong;
      default:
        return WsEventType.error;
    }
  }

  Map<String, dynamic> toJson() => {
        'event': type.name,
        if (namespaceId != null) 'namespace_id': namespaceId,
        if (environmentId != null) 'environment_id': environmentId,
        if (secretId != null) 'secret_id': secretId,
        if (data != null) 'data': data,
      };
}

/// WebSocket connection state
enum WsConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error,
}

/// WebSocket service for real-time updates
/// Uses web_socket_channel for cross-platform support
class WebSocketService {
  static WebSocketService? _instance;
  static WebSocketService get instance {
    _instance ??= WebSocketService._();
    return _instance!;
  }

  WebSocketService._();

  final AppLogger _logger = AppLogger.instance;
  final SecurityService _securityService = SecurityService.instance;

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  int _reconnectAttempts = 0;
  int _maxReconnectAttempts = 10;
  Duration _reconnectDelay = const Duration(seconds: 1);
  bool _shouldReconnect = true;
  bool _isDisposed = false;

  WsConnectionState _state = WsConnectionState.disconnected;
  String? _currentNamespaceId;
  String? _currentEnvironmentId;

  // Stream controllers for events
  final _eventController = StreamController<WsEvent>.broadcast();
  final _stateController = StreamController<WsConnectionState>.broadcast();

  WsConnectionState get state => _state;
  bool get isConnected => _state == WsConnectionState.connected;
  Stream<WsEvent> get eventStream => _eventController.stream;
  Stream<WsConnectionState> get stateStream => _stateController.stream;

  /// Connect to WebSocket server
  Future<void> connect({String? namespaceId, String? environmentId}) async {
    if (_state == WsConnectionState.connecting ||
        _state == WsConnectionState.connected) {
      _logger.debug('WebSocket already connected or connecting');
      return;
    }

    _currentNamespaceId = namespaceId;
    _currentEnvironmentId = environmentId;
    _shouldReconnect = true;
    _reconnectAttempts = 0;

    await _establishConnection();
  }

  Future<void> _establishConnection() async {
    if (_isDisposed) return;

    _updateState(WsConnectionState.connecting);
    _logger.info('Connecting to WebSocket...');

    try {
      // Get token for authentication
      final token = await _securityService.getAccessToken();
      if (token == null) {
        _logger.error('No access token available for WebSocket');
        _updateState(WsConnectionState.error);
        return;
      }

      // Build WebSocket URL with auth token
      final wsUrl = EnvConfig.instance.wsUrl(
        'ws?token=$token&namespace_id=${_currentNamespaceId ?? ''}&environment_id=${_currentEnvironmentId ?? ''}',
      );

      // Log without exposing token
      final safeUrl = Uri.parse(wsUrl).replace(
        queryParameters: {'token': '***', 'namespace_id': _currentNamespaceId ?? '', 'environment_id': _currentEnvironmentId ?? ''},
      );
      _logger.debug('WebSocket URL: $safeUrl');

      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      _subscription?.cancel();
      _subscription = _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDone,
        cancelOnError: false,
      );

      _updateState(WsConnectionState.connected);
      _reconnectAttempts = 0;
      _startHeartbeat();
      _eventController.add(WsEvent(type: WsEventType.connected));
      _logger.info('WebSocket connected');
    } catch (e) {
      _logger.error('WebSocket connection error: $e');
      _scheduleReconnect();
    }
  }

  void _handleMessage(dynamic message) {
    if (_isDisposed) return;

    try {
      final data = jsonDecode(message as String) as Map<String, dynamic>;
      final event = WsEvent.fromJson(data);
      _eventController.add(event);

      _logger.debug('WebSocket message: ${event.type}');

      if (event.type == WsEventType.sessionRevoked) {
        _logger.warning('Session revoked via WebSocket');
        disconnect();
      }
    } catch (e) {
      _logger.error('Failed to parse WebSocket message: $e');
    }
  }

  void _handleError(Object error) {
    if (_isDisposed) return;

    _logger.error('WebSocket error: $error');
    _updateState(WsConnectionState.error);
    _eventController.add(WsEvent(type: WsEventType.error, data: {'error': error.toString()}));
    _scheduleReconnect();
  }

  void _handleDone() {
    if (_isDisposed) return;

    _logger.debug('WebSocket connection closed');
    _stopHeartbeat();

    if (_shouldReconnect) {
      _scheduleReconnect();
    } else {
      _updateState(WsConnectionState.disconnected);
    }
  }

  /// Subscribe to a namespace/environment
  void subscribe({required String namespaceId, required String environmentId}) {
    _sendMessage({
      'action': 'subscribe',
      'namespace_id': namespaceId,
      'environment_id': environmentId,
    });
    _currentNamespaceId = namespaceId;
    _currentEnvironmentId = environmentId;
  }

  /// Unsubscribe from current namespace/environment
  void unsubscribe() {
    if (_currentNamespaceId != null && _currentEnvironmentId != null) {
      _sendMessage({
        'action': 'unsubscribe',
        'namespace_id': _currentNamespaceId,
        'environment_id': _currentEnvironmentId,
      });
    }
    _currentNamespaceId = null;
    _currentEnvironmentId = null;
  }

  /// Send a message through the WebSocket
  void _sendMessage(Map<String, dynamic> message) {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode(message));
    } else {
      _logger.warning('WebSocket not connected, cannot send message');
    }
  }

  /// Send ping for heartbeat
  void _sendPing() {
    if (_state == WsConnectionState.connected) {
      _sendMessage({'action': 'ping'});
    }
  }

  /// Start heartbeat timer
  void _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _sendPing();
    });
  }

  /// Stop heartbeat timer
  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  /// Schedule a reconnect with exponential backoff
  void _scheduleReconnect() {
    if (_isDisposed || !_shouldReconnect) return;
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      _logger.error('Max reconnect attempts reached');
      _updateState(WsConnectionState.error);
      return;
    }

    _reconnectTimer?.cancel();
    _updateState(WsConnectionState.reconnecting);

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    final delay = _reconnectDelay * (1 << _reconnectAttempts);
    final actualDelay = delay > const Duration(seconds: 30)
        ? const Duration(seconds: 30)
        : delay;

    _reconnectAttempts++;
    _logger.info('Scheduling reconnect in ${actualDelay.inSeconds}s (attempt $_reconnectAttempts)');

    _reconnectTimer = Timer(actualDelay, () {
      if (!_isDisposed && _shouldReconnect) {
        _establishConnection();
      }
    });
  }

  /// Disconnect from WebSocket server
  void disconnect() {
    _shouldReconnect = false;
    _reconnectTimer?.cancel();
    _stopHeartbeat();
    _subscription?.cancel();
    _channel?.sink.close();
    _channel = null;
    _updateState(WsConnectionState.disconnected);
    _logger.info('WebSocket disconnected');
  }

  /// Update connection state and notify listeners
  void _updateState(WsConnectionState newState) {
    if (_state != newState) {
      _state = newState;
      _stateController.add(newState);
    }
  }

  /// Reconnect with current settings
  void reconnect() {
    if (_state != WsConnectionState.connected) {
      _shouldReconnect = true;
      _reconnectAttempts = 0;
      _establishConnection();
    }
  }

  void dispose() {
    _isDisposed = true;
    disconnect();
    _eventController.close();
    _stateController.close();
    _instance = null;
  }
}