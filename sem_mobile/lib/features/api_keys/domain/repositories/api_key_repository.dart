import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/features/api_keys/domain/entities/api_key.dart';

/// API key repository interface
abstract class ApiKeyRepository {
  /// Get all API keys for current user
  Future<Result<List<ApiKey>>> getApiKeys();

  /// Get API keys for a specific environment
  Future<Result<List<ApiKey>>> getApiKeysForEnvironment(String environmentId);

  /// Get a single API key by ID (metadata only, not the actual key)
  Future<Result<ApiKey>> getApiKeyById(String id);

  /// Create a new API key
  Future<Result<ApiKeyCreateResult>> createApiKey({
    required String name,
    required List<String> permissions,
    String? environmentId,
    DateTime? expiresAt,
  });

  /// Revoke an API key
  Future<Result<void>> revokeApiKey(String id);

  /// Update API key metadata
  Future<Result<ApiKey>> updateApiKey({
    required String id,
    String? name,
    List<String>? permissions,
    DateTime? expiresAt,
  });

  /// Get API key usage stats
  Future<Result<ApiKeyUsageStats>> getApiKeyUsageStats(String id);
}

/// Result of creating an API key (includes the actual key)
class ApiKeyCreateResult {
  final ApiKey apiKey;
  final String rawKey; // Only available once at creation time

  const ApiKeyCreateResult({
    required this.apiKey,
    required this.rawKey,
  });
}

/// API key usage statistics
class ApiKeyUsageStats {
  final String keyId;
  final int totalRequests;
  final int successfulRequests;
  final int failedRequests;
  final DateTime? lastUsedAt;
  final Map<String, int> requestsByDay;
  final Map<String, int> requestsByEndpoint;

  const ApiKeyUsageStats({
    required this.keyId,
    required this.totalRequests,
    required this.successfulRequests,
    required this.failedRequests,
    this.lastUsedAt,
    this.requestsByDay = const {},
    this.requestsByEndpoint = const {},
  });

  factory ApiKeyUsageStats.fromJson(Map<String, dynamic> json) {
    return ApiKeyUsageStats(
      keyId: json['key_id']?.toString() ?? '',
      totalRequests: json['total_requests'] as int? ?? 0,
      successfulRequests: json['successful_requests'] as int? ?? 0,
      failedRequests: json['failed_requests'] as int? ?? 0,
      lastUsedAt: json['last_used_at'] != null
          ? DateTime.parse(json['last_used_at'] as String)
          : null,
      requestsByDay: _parseStringIntMap(json['requests_by_day']),
      requestsByEndpoint: _parseStringIntMap(json['requests_by_endpoint']),
    );
  }

  static Map<String, int> _parseStringIntMap(dynamic data) {
    if (data == null) return {};
    if (data is Map) {
      return data.map((k, v) => MapEntry(k.toString(), v as int));
    }
    return {};
  }
}