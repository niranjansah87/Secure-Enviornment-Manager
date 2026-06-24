import 'package:equatable/equatable.dart';

/// Base failure class for error handling
abstract class Failure {
  final String message;
  final String? code;
  final dynamic originalError;

  const Failure({
    required this.message,
    this.code,
    this.originalError,
  });

  @override
  String toString() => 'Failure(message: $message, code: $code)';
}

/// Network-related failures
class NetworkFailure extends Failure {
  final int? statusCode;

  const NetworkFailure({
    required super.message,
    super.code,
    super.originalError,
    this.statusCode,
  });

  factory NetworkFailure.noConnection() => const NetworkFailure(
        message: 'No internet connection. Please check your network.',
        code: 'NO_CONNECTION',
      );

  factory NetworkFailure.timeout() => const NetworkFailure(
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT',
      );

  factory NetworkFailure.serverError([String? message]) => NetworkFailure(
        message: message ?? 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
      );

  factory NetworkFailure.unauthorized() => const NetworkFailure(
        message: 'Session expired. Please log in again.',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      );

  factory NetworkFailure.forbidden() => const NetworkFailure(
        message: 'Access denied.',
        code: 'FORBIDDEN',
        statusCode: 403,
      );

  factory NetworkFailure.notFound([String? resource]) => NetworkFailure(
        message: resource != null ? '$resource not found.' : 'Resource not found.',
        code: 'NOT_FOUND',
        statusCode: 404,
      );
}

/// Authentication failures
class AuthFailure extends Failure {
  const AuthFailure({
    required super.message,
    super.code,
    super.originalError,
  });

  factory AuthFailure.invalidCredentials() => const AuthFailure(
        message: 'Invalid username or password.',
        code: 'INVALID_CREDENTIALS',
      );

  factory AuthFailure.sessionExpired() => const AuthFailure(
        message: 'Your session has expired. Please log in again.',
        code: 'SESSION_EXPIRED',
      );

  factory AuthFailure.biometricFailed() => const AuthFailure(
        message: 'Biometric authentication failed.',
        code: 'BIOMETRIC_FAILED',
      );

  factory AuthFailure.biometricNotAvailable() => const AuthFailure(
        message: 'Biometric authentication is not available on this device.',
        code: 'BIOMETRIC_NOT_AVAILABLE',
      );

  factory AuthFailure.accountLocked() => const AuthFailure(
        message: 'Account locked due to multiple failed attempts.',
        code: 'ACCOUNT_LOCKED',
      );
}

/// Storage failures
class StorageFailure extends Failure {
  const StorageFailure({
    required super.message,
    super.code,
    super.originalError,
  });

  factory StorageFailure.readError() => const StorageFailure(
        message: 'Failed to read from storage.',
        code: 'STORAGE_READ_ERROR',
      );

  factory StorageFailure.writeError() => const StorageFailure(
        message: 'Failed to write to storage.',
        code: 'STORAGE_WRITE_ERROR',
      );

  factory StorageFailure.encryptionError() => const StorageFailure(
        message: 'Failed to encrypt data.',
        code: 'ENCRYPTION_ERROR',
      );

  factory StorageFailure.decryptionError() => const StorageFailure(
        message: 'Failed to decrypt data.',
        code: 'DECRYPTION_ERROR',
      );
}

/// Validation failures
class ValidationFailure extends Failure {
  final Map<String, String>? fieldErrors;

  const ValidationFailure({
    required super.message,
    super.code,
    super.originalError,
    this.fieldErrors,
  });

  factory ValidationFailure.invalidInput(String field, String message) =>
      ValidationFailure(
        message: message,
        code: 'INVALID_INPUT',
        fieldErrors: {field: message},
      );

  factory ValidationFailure.multipleErrors(Map<String, String> errors) =>
      ValidationFailure(
        message: 'Multiple validation errors.',
        code: 'VALIDATION_ERRORS',
        fieldErrors: errors,
      );
}

/// Unknown failures
class UnknownFailure extends Failure {
  const UnknownFailure({
    super.message = 'An unexpected error occurred.',
    super.code = 'UNKNOWN',
    super.originalError,
  });
}