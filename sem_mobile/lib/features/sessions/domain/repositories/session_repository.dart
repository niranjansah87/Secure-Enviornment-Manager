import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/features/sessions/domain/entities/session.dart';

/// Session repository interface
abstract class SessionRepository {
  /// Get all active sessions for current user
  Future<Result<List<Session>>> getSessions();

  /// Get a single session by ID
  Future<Result<Session>> getSessionById(String id);

  /// Revoke a specific session
  Future<Result<void>> revokeSession(String sessionId);

  /// Revoke all sessions except current
  Future<Result<void>> revokeAllSessions();

  /// Revoke sessions on a specific device
  Future<Result<void>> revokeDeviceSessions(String deviceId);

  /// Get all devices for current user
  Future<Result<List<Device>>> getDevices();

  /// Get a single device by ID
  Future<Result<Device>> getDeviceById(String id);

  /// Remove a device
  Future<Result<void>> removeDevice(String deviceId);

  /// Mark device as trusted
  Future<Result<void>> trustDevice(String deviceId);

  /// Report suspicious activity on a device
  Future<Result<void>> reportSuspiciousDevice(String deviceId);
}