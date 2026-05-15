import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/features/audit/domain/entities/audit_log.dart';

/// Audit log filter options
class AuditLogFilter {
  final String? namespaceId;
  final String? environmentId;
  final AuditAction? action;
  final AuditSeverity? severity;
  final String? actorId;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool? isSuspicious;
  final int limit;
  final int offset;

  const AuditLogFilter({
    this.namespaceId,
    this.environmentId,
    this.action,
    this.severity,
    this.actorId,
    this.startDate,
    this.endDate,
    this.isSuspicious,
    this.limit = 50,
    this.offset = 0,
  });

  AuditLogFilter copyWith({
    String? namespaceId,
    String? environmentId,
    AuditAction? action,
    AuditSeverity? severity,
    String? actorId,
    DateTime? startDate,
    DateTime? endDate,
    bool? isSuspicious,
    int? limit,
    int? offset,
  }) {
    return AuditLogFilter(
      namespaceId: namespaceId ?? this.namespaceId,
      environmentId: environmentId ?? this.environmentId,
      action: action ?? this.action,
      severity: severity ?? this.severity,
      actorId: actorId ?? this.actorId,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isSuspicious: isSuspicious ?? this.isSuspicious,
      limit: limit ?? this.limit,
      offset: offset ?? this.offset,
    );
  }

  Map<String, dynamic> toQueryParams() {
    return {
      if (namespaceId != null) 'namespace_id': namespaceId,
      if (environmentId != null) 'environment_id': environmentId,
      if (action != null) 'action': action!.name,
      if (severity != null) 'severity': severity!.name,
      if (actorId != null) 'actor_id': actorId,
      if (startDate != null) 'start_date': startDate!.toIso8601String(),
      if (endDate != null) 'end_date': endDate!.toIso8601String(),
      if (isSuspicious != null) 'suspicious': isSuspicious.toString(),
      'limit': limit.toString(),
      'offset': offset.toString(),
    };
  }
}

/// Audit log repository interface
abstract class AuditRepository {
  /// Get audit logs with optional filtering
  Future<Result<List<AuditLog>>> getAuditLogs(AuditLogFilter? filter);

  /// Get a single audit log by ID
  Future<Result<AuditLog>> getAuditLogById(String id);

  /// Get audit logs for a specific resource
  Future<Result<List<AuditLog>>> getAuditLogsForResource(
    String resourceId,
    String resourceType,
  );

  /// Search audit logs
  Future<Result<List<AuditLog>>> searchAuditLogs(String query);

  /// Export audit logs
  Future<Result<String>> exportAuditLogs(AuditLogFilter? filter, String format);
}