import 'package:equatable/equatable.dart';
import 'package:sem_mobile/features/sessions/domain/entities/session.dart';

enum SessionStatus {
  initial,
  loading,
  success,
  failure,
  revoking,
  revoked,
  allRevoked,
}

class SessionState extends Equatable {
  final SessionStatus status;
  final List<Session> sessions;
  final List<Device> devices;
  final Session? selectedSession;
  final String? errorMessage;
  final String? successMessage;

  const SessionState({
    this.status = SessionStatus.initial,
    this.sessions = const [],
    this.devices = const [],
    this.selectedSession,
    this.errorMessage,
    this.successMessage,
  });

  Session? get currentSession {
    try {
      return sessions.firstWhere((s) => s.isCurrent);
    } catch (_) {
      return null;
    }
  }

  List<Session> get nonCurrentSessions {
    return sessions.where((s) => !s.isCurrent).toList();
  }

  List<Session> get suspiciousSessions {
    return sessions.where((s) => s.isSuspicious).toList();
  }

  List<Device> get suspiciousDevices {
    return devices.where((d) => d.isSuspicious).toList();
  }

  SessionState copyWith({
    SessionStatus? status,
    List<Session>? sessions,
    List<Device>? devices,
    Session? selectedSession,
    bool clearSelectedSession = false,
    String? errorMessage,
    bool clearError = false,
    String? successMessage,
    bool clearSuccess = false,
  }) {
    return SessionState(
      status: status ?? this.status,
      sessions: sessions ?? this.sessions,
      devices: devices ?? this.devices,
      selectedSession: clearSelectedSession ? null : (selectedSession ?? this.selectedSession),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      successMessage: clearSuccess ? null : (successMessage ?? this.successMessage),
    );
  }

  @override
  List<Object?> get props => [
        status,
        sessions,
        devices,
        selectedSession,
        errorMessage,
        successMessage,
      ];
}