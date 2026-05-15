import 'package:equatable/equatable.dart';

/// Session entity
class Session extends Equatable {
  final String id;
  final String userId;
  final String? deviceId;
  final String? deviceName;
  final String? deviceType;
  final String? platform; // ios, android, web, desktop
  final String? ipAddress;
  final String? location;
  final String? userAgent;
  final DateTime createdAt;
  final DateTime? lastActiveAt;
  final DateTime? expiresAt;
  final bool isCurrent;
  final bool isSuspicious;

  const Session({
    required this.id,
    required this.userId,
    this.deviceId,
    this.deviceName,
    this.deviceType,
    this.platform,
    this.ipAddress,
    this.location,
    this.userAgent,
    required this.createdAt,
    this.lastActiveAt,
    this.expiresAt,
    this.isCurrent = false,
    this.isSuspicious = false,
  });

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      deviceId: json['device_id'] as String?,
      deviceName: json['device_name'] as String? ?? json['device'] as String?,
      deviceType: json['device_type'] as String?,
      platform: json['platform'] as String?,
      ipAddress: json['ip_address'] as String? ?? json['ip'] as String?,
      location: json['location'] as String?,
      userAgent: json['user_agent'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      lastActiveAt: json['last_active_at'] != null
          ? DateTime.parse(json['last_active_at'] as String)
          : null,
      expiresAt: json['expires_at'] != null
          ? DateTime.parse(json['expires_at'] as String)
          : null,
      isCurrent: json['is_current'] as bool? ?? false,
      isSuspicious: json['is_suspicious'] as bool? ?? json['suspicious'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'device_id': deviceId,
      'device_name': deviceName,
      'device_type': deviceType,
      'platform': platform,
      'ip_address': ipAddress,
      'location': location,
      'user_agent': userAgent,
      'created_at': createdAt.toIso8601String(),
      'last_active_at': lastActiveAt?.toIso8601String(),
      'expires_at': expiresAt?.toIso8601String(),
      'is_current': isCurrent,
      'is_suspicious': isSuspicious,
    };
  }

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  String get relativeLastActive {
    if (lastActiveAt == null) return 'Never';
    final now = DateTime.now();
    final diff = now.difference(lastActiveAt!);

    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${(diff.inDays / 7).floor()}w ago';
  }

  String get platformIcon {
    return switch (platform?.toLowerCase()) {
      'ios' => '📱',
      'android' => '📱',
      'web' => '🌐',
      'desktop' => '💻',
      'windows' => '🪟',
      'macos' => '🍎',
      'linux' => '🐧',
      _ => '💻',
    };
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        deviceId,
        platform,
        isCurrent,
        isSuspicious,
      ];
}

/// Device entity
class Device extends Equatable {
  final String id;
  final String name;
  final String? type;
  final String? platform;
  final String? ipAddress;
  final String? location;
  final DateTime firstSeenAt;
  final DateTime? lastActiveAt;
  final int sessionCount;
  final bool isCurrent;
  final bool isTrusted;
  final bool isSuspicious;

  const Device({
    required this.id,
    required this.name,
    this.type,
    this.platform,
    this.ipAddress,
    this.location,
    required this.firstSeenAt,
    this.lastActiveAt,
    this.sessionCount = 0,
    this.isCurrent = false,
    this.isTrusted = false,
    this.isSuspicious = false,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown Device',
      type: json['type'] as String?,
      platform: json['platform'] as String?,
      ipAddress: json['ip_address'] as String? ?? json['ip'] as String?,
      location: json['location'] as String?,
      firstSeenAt: json['first_seen_at'] != null
          ? DateTime.parse(json['first_seen_at'] as String)
          : DateTime.now(),
      lastActiveAt: json['last_active_at'] != null
          ? DateTime.parse(json['last_active_at'] as String)
          : null,
      sessionCount: json['session_count'] as int? ?? 0,
      isCurrent: json['is_current'] as bool? ?? false,
      isTrusted: json['is_trusted'] as bool? ?? json['trusted'] as bool? ?? false,
      isSuspicious: json['is_suspicious'] as bool? ?? json['suspicious'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'platform': platform,
      'ip_address': ipAddress,
      'location': location,
      'first_seen_at': firstSeenAt.toIso8601String(),
      'last_active_at': lastActiveAt?.toIso8601String(),
      'session_count': sessionCount,
      'is_current': isCurrent,
      'is_trusted': isTrusted,
      'is_suspicious': isSuspicious,
    };
  }

  String get relativeLastActive {
    if (lastActiveAt == null) return 'Never';
    final now = DateTime.now();
    final diff = now.difference(lastActiveAt!);

    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${(diff.inDays / 7).floor()}w ago';
  }

  String get platformIcon {
    return switch (platform?.toLowerCase()) {
      'ios' => '📱',
      'android' => '📱',
      'web' => '🌐',
      'desktop' => '💻',
      'windows' => '🪟',
      'macos' => '🍎',
      'linux' => '🐧',
      _ => '💻',
    };
  }

  @override
  List<Object?> get props => [
        id,
        name,
        platform,
        isCurrent,
        isTrusted,
        isSuspicious,
      ];
}