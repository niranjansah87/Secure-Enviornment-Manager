import 'package:sem_mobile/core/errors/failures.dart';
import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/features/auth/domain/entities/auth.dart';

/// Auth repository interface
abstract class AuthRepository {
  /// Login with credentials
  Future<Result<AuthResponse>> login(LoginCredentials credentials);

  /// Get current user profile
  Future<Result<User>> getCurrentUser();

  /// Logout and clear local storage
  Future<Result<bool>> logout();

  /// Check if user has valid session
  Future<Result<bool>> isAuthenticated();

  /// Refresh access token using refresh token
  Future<Result<AuthTokens>> refreshToken();
}