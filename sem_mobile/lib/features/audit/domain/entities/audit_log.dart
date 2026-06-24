import 'package:equatable/equatable.dart';

/// Audit log action types
enum AuditAction {
  login,
  logout,
  loginFailed,
  sessionCreated,
  sessionRevoked,
  sessionExpired,
  deviceAdded,
  deviceRemoved,
  apiKeyCreated,
  apiKeyRevoked,
  apiKeyUsed,
  secretCreated,
  secretUpdated,
  secretDeleted,
  secretViewed,
  secretExported,
  environmentCreated,
  environmentUpdated,
  environmentDeleted,
  userCreated,
  userUpdated,
  userDeleted,
  permissionGranted,
  permissionRevoked,
  settingsChanged,
  securityAlert,
  suspiciousActivity,
  unknown,
}

/// Audit log severity levels
enum AuditSeverity {
  info,
  warning,
  error,
  critical,
}

/// Audit log entity
class AuditLog extends Equatable {
  final String id;
  final AuditAction action;
  final AuditSeverity severity;
  final String actorId;
  final String? actorName;
  final String? actorEmail;
  final String? actorType; // user, api_key, system
  final String? namespaceId;
  final String? environmentId;
  final String? resourceId;
  final String? resourceType; // secret, environment, api_key, etc.
  final String? resourceName;
  final Map<String, dynamic>? metadata;
  final String? ipAddress;
  final String? userAgent;
  final String? deviceId;
  final String? location;
  final DateTime timestamp;
  final bool isSuspicious;

  const AuditLog({
    required this.id,
    required this.action,
    required this.severity,
    required this.actorId,
    this.actorName,
    this.actorEmail,
    this.actorType,
    this.namespaceId,
    this.environmentId,
    this.resourceId,
    this.resourceType,
    this.resourceName,
    this.metadata,
    this.ipAddress,
    this.userAgent,
    this.deviceId,
    this.location,
    required this.timestamp,
    this.isSuspicious = false,
  });

  factory AuditLog.fromJson(Map<String, dynamic> json) {
    final actionStr = json['action'] as String? ?? 'unknown';
    final severityStr = json['severity'] as String? ?? 'info';

    return AuditLog(
      id: json['id']?.toString() ?? '',
      action: _parseAction(actionStr),
      severity: _parseSeverity(severityStr),
      actorId: json['actor_id']?.toString() ?? json['user_id']?.toString() ?? '',
      actorName: json['actor_name'] as String? ?? json['user_name'] as String?,
      actorEmail: json['actor_email'] as String? ?? json['user_email'] as String?,
      actorType: json['actor_type'] as String? ?? 'user',
      namespaceId: json['namespace_id'] as String?,
      environmentId: json['environment_id'] as String?,
      resourceId: json['resource_id'] as String?,
      resourceType: json['resource_type'] as String?,
      resourceName: json['resource_name'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      ipAddress: json['ip_address'] as String? ?? json['ip'] as String?,
      userAgent: json['user_agent'] as String?,
      deviceId: json['device_id'] as String?,
      location: json['location'] as String?,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now(),
      isSuspicious: json['is_suspicious'] as bool? ?? json['suspicious'] as bool? ?? false,
    );
  }

  static AuditAction _parseAction(String action) {
    return AuditAction.values.firstWhere(
      (e) => e.name == action || e.name.toUpperCase() == action.toUpperCase(),
      orElse: () => AuditAction.unknown,
    );
  }

  static AuditSeverity _parseSeverity(String severity) {
    return AuditSeverity.values.firstWhere(
      (e) => e.name == severity || e.name.toUpperCase() == severity.toUpperCase(),
      orElse: () => AuditSeverity.info,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'action': action.name,
      'severity': severity.name,
      'actor_id': actorId,
      'actor_name': actorName,
      'actor_email': actorEmail,
      'actor_type': actorType,
      'namespace_id': namespaceId,
      'environment_id': environmentId,
      'resource_id': resourceId,
      'resource_type': resourceType,
      'resource_name': resourceName,
      'metadata': metadata,
      'ip_address': ipAddress,
      'user_agent': userAgent,
      'device_id': deviceId,
      'location': location,
      'timestamp': timestamp.toIso8601String(),
      'is_suspicious': isSuspicious,
    };
  }

  String get actionDisplayName {
    return switch (action) {
      AuditAction.login => 'User Login',
      AuditAction.logout => 'User Logout',
      AuditAction.loginFailed => 'Failed Login',
      AuditAction.sessionCreated => 'Session Created',
      AuditAction.sessionRevoked => 'Session Revoked',
      AuditAction.sessionExpired => 'Session Expired',
      AuditAction.deviceAdded => 'Device Added',
      AuditAction.deviceRemoved => 'Device Removed',
      AuditAction.apiKeyCreated => 'API Key Created',
      AuditAction.apiKeyRevoked => 'API Key Revoked',
      AuditAction.apiKeyUsed => 'API Key Used',
      AuditAction.secretCreated => 'Secret Created',
      AuditAction.secretUpdated => 'Secret Updated',
      AuditAction.secretDeleted => 'Secret Deleted',
      AuditAction.secretViewed => 'Secret Viewed',
      AuditAction.secretExported => 'Secret Exported',
      AuditAction.environmentCreated => 'Environment Created',
      AuditAction.environmentUpdated => 'Environment Updated',
      AuditAction.environmentDeleted => 'Environment Deleted',
      AuditAction.userCreated => 'User Created',
      AuditAction.userUpdated => 'User Updated',
      AuditAction.userDeleted => 'User Deleted',
      AuditAction.permissionGranted => 'Permission Granted',
      AuditAction.permissionRevoked => 'Permission Revoked',
      AuditAction.settingsChanged => 'Settings Changed',
      AuditAction.securityAlert => 'Security Alert',
      AuditAction.suspiciousActivity => 'Suspicious Activity',
      AuditAction.unknown => 'Unknown Event',
    };
  }

  String get severityDisplayName {
    return switch (severity) {
      AuditSeverity.info => 'Info',
      AuditSeverity.warning => 'Warning',
      AuditSeverity.error => 'Error',
      AuditSeverity.critical => 'Critical',
    };
  }

  String get relativeTime {
    final now = DateTime.now();
    final diff = now.difference(timestamp);

    if (diff.inSeconds < 60) {
      return '${diff.inSeconds}s ago';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else if (diff.inDays < 30) {
      return '${(diff.inDays / 7).floor()}w ago';
    } else if (diff.inDays < 365) {
      return '${(diff.inDays / 30).floor()}mo ago';
    } else {
      return '${(diff.inDays / 365).floor()}y ago';
    }
  }

  @override
  List<Object?> get props => [
        id,
        action,
        severity,
        actorId,
        timestamp,
        resourceId,
        isSuspicious,
      ];
}