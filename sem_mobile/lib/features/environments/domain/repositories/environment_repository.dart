import 'package:sem_mobile/core/errors/failures.dart';
import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/features/environments/domain/entities/environment.dart';

/// Environment repository interface
abstract class EnvironmentRepository {
  /// Get all namespaces
  Future<Result<List<Namespace>>> getNamespaces();

  /// Get environments for a namespace
  Future<Result<List<Environment>>> getEnvironments(String namespaceId);

  /// Get environment details
  Future<Result<Environment>> getEnvironment(String namespaceId, String environmentId);

  /// Create new environment
  Future<Result<Environment>> createEnvironment({
    required String namespaceId,
    required String name,
    String? description,
    String? color,
  });

  /// Update environment
  Future<Result<Environment>> updateEnvironment({
    required String namespaceId,
    required String environmentId,
    String? name,
    String? description,
    String? color,
  });

  /// Delete environment
  Future<Result<void>> deleteEnvironment(String namespaceId, String environmentId);

  /// Toggle favorite status
  Future<Result<Environment>> toggleFavorite(
    String namespaceId,
    String environmentId,
  );

  /// Get recent environments
  Future<Result<List<Environment>>> getRecentEnvironments();

  /// Get favorite environments
  Future<Result<List<Environment>>> getFavoriteEnvironments();
}