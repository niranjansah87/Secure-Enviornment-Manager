import 'package:equatable/equatable.dart';

/// Security alert types
enum SecurityAlertType {
  suspiciousActivity,
  sessionRevoked,
  forcedLogout,
  deviceCompromised,
  apiKeyExposed,
  unusualLocation,
  multipleFailedAttempts,
  permissionChanged,
}

/// Security alert entity
class SecurityAlert extends Equatable {
  final String id;
  final SecurityAlertType type;
  final String title;
  final String message;
  final String? deviceId;
  final String? sessionId;
  final String? ipAddress;
  final DateTime createdAt;
  final bool isRead;
  final bool isDismissed;
  final Map<String, dynamic>? metadata;

  const SecurityAlert({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.deviceId,
    this.sessionId,
    this.ipAddress,
    required this.createdAt,
    this.isRead = false,
    this.isDismissed = false,
    this.metadata,
  });

  factory SecurityAlert.fromJson(Map<String, dynamic> json) {
    return SecurityAlert(
      id: json['id']?.toString() ?? '',
      type: _parseType(json['type'] as String?),
      title: json['title'] as String? ?? 'Security Alert',
      message: json['message'] as String? ?? '',
      deviceId: json['device_id'] as String?,
      sessionId: json['session_id'] as String?,
      ipAddress: json['ip_address'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      isRead: json['is_read'] as bool? ?? false,
      isDismissed: json['is_dismissed'] as bool? ?? false,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  static SecurityAlertType _parseType(String? type) {
    return SecurityAlertType.values.firstWhere(
      (e) => e.name == type || e.name.toUpperCase() == (type?.toUpperCase() ?? ''),
      orElse: () => SecurityAlertType.suspiciousActivity,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'title': title,
      'message': message,
      'device_id': deviceId,
      'session_id': sessionId,
      'ip_address': ipAddress,
      'created_at': createdAt.toIso8601String(),
      'is_read': isRead,
      'is_dismissed': isDismissed,
      'metadata': metadata,
    };
  }

  SecurityAlert copyWith({
    String? id,
    SecurityAlertType? type,
    String? title,
    String? message,
    String? deviceId,
    String? sessionId,
    String? ipAddress,
    DateTime? createdAt,
    bool? isRead,
    bool? isDismissed,
    Map<String, dynamic>? metadata,
  }) {
    return SecurityAlert(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      message: message ?? this.message,
      deviceId: deviceId ?? this.deviceId,
      sessionId: sessionId ?? this.sessionId,
      ipAddress: ipAddress ?? this.ipAddress,
      createdAt: createdAt ?? this.createdAt,
      isRead: isRead ?? this.isRead,
      isDismissed: isDismissed ?? this.isDismissed,
      metadata: metadata ?? this.metadata,
    );
  }

  String get relativeTime {
    final now = DateTime.now();
    final diff = now.difference(createdAt);

    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${(diff.inDays / 7).floor()}w ago';
  }

  @override
  List<Object?> get props => [
        id,
        type,
        title,
        message,
        deviceId,
        sessionId,
        isRead,
        isDismissed,
      ];
}