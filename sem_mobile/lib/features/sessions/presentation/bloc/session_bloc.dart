import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/features/sessions/domain/entities/session.dart';
import 'package:sem_mobile/features/sessions/domain/repositories/session_repository.dart';
import 'package:sem_mobile/features/sessions/presentation/bloc/session_event.dart';
import 'package:sem_mobile/features/sessions/presentation/bloc/session_state.dart';

class SessionBloc extends Bloc<SessionEvent, SessionState> {
  final SessionRepository _repository;
  final AppLogger _logger = AppLogger.instance;

  SessionBloc({required SessionRepository repository})
      : _repository = repository,
        super(const SessionState()) {
    on<SessionLoadRequested>(_onLoadRequested);
    on<SessionRefreshRequested>(_onRefreshRequested);
    on<SessionRevokeRequested>(_onRevokeRequested);
    on<SessionRevokeAllRequested>(_onRevokeAllRequested);
    on<SessionRevokeDeviceRequested>(_onRevokeDeviceRequested);
    on<SessionDeviceTrustRequested>(_onDeviceTrustRequested);
    on<SessionSuspiciousReportRequested>(_onSuspiciousReportRequested);
    on<SessionSelected>(_onSessionSelected);
    on<SessionWebSocketEventReceived>(_onWebSocketEventReceived);
  }

  Future<void> _onLoadRequested(
    SessionLoadRequested event,
    Emitter<SessionState> emit,
  ) async {
    emit(state.copyWith(status: SessionStatus.loading, clearError: true));

    try {
      final sessionsResult = await _repository.getSessions();
      final devicesResult = await _repository.getDevices();

      switch (sessionsResult) {
        case Success(data: final sessions):
          emit(state.copyWith(
            status: SessionStatus.success,
            sessions: sessions,
          ));
        case Error(failure: final failure):
          _logger.error('Failed to load sessions: ${failure.message}');
          emit(state.copyWith(
            status: SessionStatus.failure,
            errorMessage: failure.message,
          ));
      }

      switch (devicesResult) {
        case Success(data: final devices):
          emit(state.copyWith(devices: devices));
        case Error():
          // Devices are secondary, don't fail the whole state
          break;
      }
    } catch (e, stack) {
      _logger.error('Error loading sessions: $e\n$stack');
      emit(state.copyWith(
        status: SessionStatus.failure,
        errorMessage: 'Failed to load sessions',
      ));
    }
  }

  Future<void> _onRefreshRequested(
    SessionRefreshRequested event,
    Emitter<SessionState> emit,
  ) async {
    add(const SessionLoadRequested());
  }

  Future<void> _onRevokeRequested(
    SessionRevokeRequested event,
    Emitter<SessionState> emit,
  ) async {
    emit(state.copyWith(status: SessionStatus.revoking));

    try {
      final result = await _repository.revokeSession(event.sessionId);

      switch (result) {
        case Success():
          _logger.info('Session revoked: ${event.sessionId}');
          final updatedSessions = state.sessions
              .where((s) => s.id != event.sessionId)
              .toList();
          emit(state.copyWith(
            status: SessionStatus.revoked,
            sessions: updatedSessions,
            successMessage: 'Session revoked successfully',
          ));
        case Error(failure: final failure):
          _logger.error('Failed to revoke session: ${failure.message}');
          emit(state.copyWith(
            status: SessionStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error revoking session: $e\n$stack');
      emit(state.copyWith(
        status: SessionStatus.failure,
        errorMessage: 'Failed to revoke session',
      ));
    }
  }

  Future<void> _onRevokeAllRequested(
    SessionRevokeAllRequested event,
    Emitter<SessionState> emit,
  ) async {
    emit(state.copyWith(status: SessionStatus.revoking));

    try {
      final result = await _repository.revokeAllSessions();

      switch (result) {
        case Success():
          _logger.info('All sessions revoked');
          // Keep only current session
          final currentSessions = state.sessions.where((s) => s.isCurrent).toList();
          emit(state.copyWith(
            status: SessionStatus.allRevoked,
            sessions: currentSessions,
            successMessage: 'All other sessions revoked',
          ));
        case Error(failure: final failure):
          _logger.error('Failed to revoke all sessions: ${failure.message}');
          emit(state.copyWith(
            status: SessionStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error revoking all sessions: $e\n$stack');
      emit(state.copyWith(
        status: SessionStatus.failure,
        errorMessage: 'Failed to revoke sessions',
      ));
    }
  }

  Future<void> _onRevokeDeviceRequested(
    SessionRevokeDeviceRequested event,
    Emitter<SessionState> emit,
  ) async {
    emit(state.copyWith(status: SessionStatus.revoking));

    try {
      final result = await _repository.revokeDeviceSessions(event.deviceId);

      switch (result) {
        case Success():
          _logger.info('Device sessions revoked: ${event.deviceId}');
          // Remove sessions associated with this device
          final updatedSessions = state.sessions
              .where((s) => s.deviceId != event.deviceId)
              .toList();
          emit(state.copyWith(
            status: SessionStatus.revoked,
            sessions: updatedSessions,
            successMessage: 'Device sessions revoked',
          ));
        case Error(failure: final failure):
          _logger.error('Failed to revoke device sessions: ${failure.message}');
          emit(state.copyWith(
            status: SessionStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error revoking device sessions: $e\n$stack');
      emit(state.copyWith(
        status: SessionStatus.failure,
        errorMessage: 'Failed to revoke device sessions',
      ));
    }
  }

  Future<void> _onDeviceTrustRequested(
    SessionDeviceTrustRequested event,
    Emitter<SessionState> emit,
  ) async {
    try {
      final result = await _repository.trustDevice(event.deviceId);

      switch (result) {
        case Success():
          _logger.info('Device trusted: ${event.deviceId}');
          final updatedDevices = state.devices.map((d) {
            if (d.id == event.deviceId) {
              return Device(
                id: d.id,
                name: d.name,
                type: d.type,
                platform: d.platform,
                ipAddress: d.ipAddress,
                location: d.location,
                firstSeenAt: d.firstSeenAt,
                lastActiveAt: d.lastActiveAt,
                sessionCount: d.sessionCount,
                isCurrent: d.isCurrent,
                isTrusted: true,
                isSuspicious: false,
              );
            }
            return d;
          }).toList();
          emit(state.copyWith(
            devices: updatedDevices,
            successMessage: 'Device marked as trusted',
          ));
        case Error(failure: final failure):
          _logger.error('Failed to trust device: ${failure.message}');
          emit(state.copyWith(errorMessage: failure.message));
      }
    } catch (e, stack) {
      _logger.error('Error trusting device: $e\n$stack');
      emit(state.copyWith(errorMessage: 'Failed to trust device'));
    }
  }

  Future<void> _onSuspiciousReportRequested(
    SessionSuspiciousReportRequested event,
    Emitter<SessionState> emit,
  ) async {
    try {
      final result = await _repository.reportSuspiciousDevice(event.deviceId);

      switch (result) {
        case Success():
          _logger.warning('Suspicious device reported: ${event.deviceId}');
          emit(state.copyWith(successMessage: 'Suspicious activity reported'));
        case Error(failure: final failure):
          _logger.error('Failed to report suspicious device: ${failure.message}');
          emit(state.copyWith(errorMessage: failure.message));
      }
    } catch (e, stack) {
      _logger.error('Error reporting suspicious device: $e\n$stack');
      emit(state.copyWith(errorMessage: 'Failed to report suspicious activity'));
    }
  }

  void _onSessionSelected(
    SessionSelected event,
    Emitter<SessionState> emit,
  ) {
    emit(state.copyWith(selectedSession: event.session));
  }

  void _onWebSocketEventReceived(
    SessionWebSocketEventReceived event,
    Emitter<SessionState> emit,
  ) {
    _logger.debug('Received session WebSocket event: ${event.eventType}');

    switch (event.eventType) {
      case 'session_revoked':
        if (event.sessionId != null) {
          final updatedSessions = state.sessions
              .where((s) => s.id != event.sessionId)
              .toList();
          emit(state.copyWith(sessions: updatedSessions));
        }
        break;
      case 'session_expired':
        if (event.sessionId != null) {
          // Handle session expiration
          add(const SessionLoadRequested());
        }
        break;
      case 'device_removed':
        if (event.deviceId != null) {
          final updatedDevices = state.devices
              .where((d) => d.id != event.deviceId)
              .toList();
          emit(state.copyWith(devices: updatedDevices));
        }
        break;
      default:
        break;
    }
  }
}