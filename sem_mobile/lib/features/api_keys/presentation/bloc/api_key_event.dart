import 'package:equatable/equatable.dart';

abstract class ApiKeyEvent extends Equatable {
  const ApiKeyEvent();

  @override
  List<Object?> get props => [];
}

class ApiKeyLoadRequested extends ApiKeyEvent {
  final String? environmentId;

  const ApiKeyLoadRequested({this.environmentId});

  @override
  List<Object?> get props => [environmentId];
}

class ApiKeyRefreshRequested extends ApiKeyEvent {
  const ApiKeyRefreshRequested();
}

class ApiKeyCreateRequested extends ApiKeyEvent {
  final String name;
  final List<String> permissions;
  final String? environmentId;
  final DateTime? expiresAt;

  const ApiKeyCreateRequested({
    required this.name,
    required this.permissions,
    this.environmentId,
    this.expiresAt,
  });

  @override
  List<Object?> get props => [name, permissions, environmentId, expiresAt];
}

class ApiKeyRevokeRequested extends ApiKeyEvent {
  final String keyId;

  const ApiKeyRevokeRequested(this.keyId);

  @override
  List<Object?> get props => [keyId];
}

class ApiKeyUpdateRequested extends ApiKeyEvent {
  final String keyId;
  final String? name;
  final List<String>? permissions;
  final DateTime? expiresAt;

  const ApiKeyUpdateRequested({
    required this.keyId,
    this.name,
    this.permissions,
    this.expiresAt,
  });

  @override
  List<Object?> get props => [keyId, name, permissions, expiresAt];
}

class ApiKeySelected extends ApiKeyEvent {
  final String keyId;

  const ApiKeySelected(this.keyId);

  @override
  List<Object?> get props => [keyId];
}

class ApiKeyUsageStatsRequested extends ApiKeyEvent {
  final String keyId;

  const ApiKeyUsageStatsRequested(this.keyId);

  @override
  List<Object?> get props => [keyId];
}

class ApiKeyCopied extends ApiKeyEvent {
  final String keyId;

  const ApiKeyCopied(this.keyId);

  @override
  List<Object?> get props => [keyId];
}

class ApiKeyWebSocketEventReceived extends ApiKeyEvent {
  final String eventType;
  final String? keyId;

  const ApiKeyWebSocketEventReceived({
    required this.eventType,
    this.keyId,
  });

  @override
  List<Object?> get props => [eventType, keyId];
}