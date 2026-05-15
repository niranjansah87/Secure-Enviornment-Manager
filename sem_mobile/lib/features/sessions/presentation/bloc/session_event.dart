import 'package:equatable/equatable.dart';
import 'package:sem_mobile/features/sessions/domain/entities/session.dart';

abstract class SessionEvent extends Equatable {
  const SessionEvent();

  @override
  List<Object?> get props => [];
}

class SessionLoadRequested extends SessionEvent {
  const SessionLoadRequested();
}

class SessionRefreshRequested extends SessionEvent {
  const SessionRefreshRequested();
}

class SessionRevokeRequested extends SessionEvent {
  final String sessionId;
  final String? reason;

  const SessionRevokeRequested({
    required this.sessionId,
    this.reason,
  });

  @override
  List<Object?> get props => [sessionId, reason];
}

class SessionRevokeAllRequested extends SessionEvent {
  const SessionRevokeAllRequested();
}

class SessionRevokeDeviceRequested extends SessionEvent {
  final String deviceId;

  const SessionRevokeDeviceRequested(this.deviceId);

  @override
  List<Object?> get props => [deviceId];
}

class SessionDeviceTrustRequested extends SessionEvent {
  final String deviceId;

  const SessionDeviceTrustRequested(this.deviceId);

  @override
  List<Object?> get props => [deviceId];
}

class SessionSuspiciousReportRequested extends SessionEvent {
  final String deviceId;

  const SessionSuspiciousReportRequested(this.deviceId);

  @override
  List<Object?> get props => [deviceId];
}

class SessionSelected extends SessionEvent {
  final Session session;

  const SessionSelected(this.session);

  @override
  List<Object?> get props => [session];
}

class SessionWebSocketEventReceived extends SessionEvent {
  final String eventType;
  final String? sessionId;
  final String? deviceId;

  const SessionWebSocketEventReceived({
    required this.eventType,
    this.sessionId,
    this.deviceId,
  });

  @override
  List<Object?> get props => [eventType, sessionId, deviceId];
}