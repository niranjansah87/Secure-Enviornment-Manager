import 'package:equatable/equatable.dart';

/// API key entity
class ApiKey extends Equatable {
  final String id;
  final String name;
  final String? keyPrefix; // First 8 chars for identification
  final String? keySuffix; // Last 4 chars for identification
  final String? scopes;
  final List<String> permissions;
  final String? environmentId;
  final String? environmentName;
  final DateTime createdAt;
  final DateTime? lastUsedAt;
  final DateTime? expiresAt;
  final bool isActive;
  final int usageCount;

  const ApiKey({
    required this.id,
    required this.name,
    this.keyPrefix,
    this.keySuffix,
    this.scopes,
    this.permissions = const [],
    this.environmentId,
    this.environmentName,
    required this.createdAt,
    this.lastUsedAt,
    this.expiresAt,
    this.isActive = true,
    this.usageCount = 0,
  });

  factory ApiKey.fromJson(Map<String, dynamic> json) {
    return ApiKey(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unnamed Key',
      keyPrefix: json['key_prefix'] as String? ?? json['prefix'] as String?,
      keySuffix: json['key_suffix'] as String? ?? json['suffix'] as String?,
      scopes: json['scopes'] as String?,
      permissions: _parsePermissions(json['permissions'] ?? json['scopes']),
      environmentId: json['environment_id'] as String?,
      environmentName: json['environment_name'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      lastUsedAt: json['last_used_at'] != null
          ? DateTime.parse(json['last_used_at'] as String)
          : null,
      expiresAt: json['expires_at'] != null
          ? DateTime.parse(json['expires_at'] as String)
          : null,
      isActive: json['is_active'] as bool? ?? json['active'] as bool? ?? true,
      usageCount: json['usage_count'] as int? ?? 0,
    );
  }

  static List<String> _parsePermissions(dynamic permissions) {
    if (permissions == null) return [];
    if (permissions is List) return permissions.map((e) => e.toString()).toList();
    if (permissions is String) {
      return permissions.split(',').map((e) => e.trim()).toList();
    }
    return [];
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'key_prefix': keyPrefix,
      'key_suffix': keySuffix,
      'scopes': scopes ?? permissions.join(','),
      'permissions': permissions,
      'environment_id': environmentId,
      'environment_name': environmentName,
      'created_at': createdAt.toIso8601String(),
      'last_used_at': lastUsedAt?.toIso8601String(),
      'expires_at': expiresAt?.toIso8601String(),
      'is_active': isActive,
      'usage_count': usageCount,
    };
  }

  String get maskedDisplay {
    if (keyPrefix != null && keySuffix != null) {
      return '${keyPrefix!}[REDACTED]${keySuffix!}';
    }
    return '****************************************';
  }

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  String get relativeLastUsed {
    if (lastUsedAt == null) return 'Never used';
    final now = DateTime.now();
    final diff = now.difference(lastUsedAt!);

    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${(diff.inDays / 7).floor()}w ago';
  }

  String get statusLabel {
    if (!isActive) return 'Inactive';
    if (isExpired) return 'Expired';
    return 'Active';
  }

  @override
  List<Object?> get props => [
        id,
        name,
        keyPrefix,
        isActive,
        isExpired,
        permissions,
      ];
}