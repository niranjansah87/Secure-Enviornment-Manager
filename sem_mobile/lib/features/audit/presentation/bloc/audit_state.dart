import 'package:equatable/equatable.dart';
import 'package:sem_mobile/features/audit/domain/entities/audit_log.dart';
import 'package:sem_mobile/features/audit/domain/repositories/audit_repository.dart';

enum AuditStatus {
  initial,
  loading,
  success,
  failure,
  exporting,
  exported,
}

class AuditState extends Equatable {
  final AuditStatus status;
  final List<AuditLog> logs;
  final AuditLog? selectedLog;
  final AuditLogFilter filter;
  final String? errorMessage;
  final bool hasReachedMax;
  final String? exportUrl;
  final String? searchQuery;

  const AuditState({
    this.status = AuditStatus.initial,
    this.logs = const [],
    this.selectedLog,
    this.filter = const AuditLogFilter(),
    this.errorMessage,
    this.hasReachedMax = false,
    this.exportUrl,
    this.searchQuery,
  });

  AuditState copyWith({
    AuditStatus? status,
    List<AuditLog>? logs,
    AuditLog? selectedLog,
    bool clearSelectedLog = false,
    AuditLogFilter? filter,
    String? errorMessage,
    bool clearError = false,
    bool? hasReachedMax,
    String? exportUrl,
    bool clearExportUrl = false,
    String? searchQuery,
    bool clearSearchQuery = false,
  }) {
    return AuditState(
      status: status ?? this.status,
      logs: logs ?? this.logs,
      selectedLog: clearSelectedLog ? null : (selectedLog ?? this.selectedLog),
      filter: filter ?? this.filter,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      hasReachedMax: hasReachedMax ?? this.hasReachedMax,
      exportUrl: clearExportUrl ? null : (exportUrl ?? this.exportUrl),
      searchQuery: clearSearchQuery ? null : (searchQuery ?? this.searchQuery),
    );
  }

  @override
  List<Object?> get props => [
        status,
        logs,
        selectedLog,
        filter,
        errorMessage,
        hasReachedMax,
        exportUrl,
        searchQuery,
      ];
}