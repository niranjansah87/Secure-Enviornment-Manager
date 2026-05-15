import 'package:equatable/equatable.dart';
import 'package:sem_mobile/features/audit/domain/entities/audit_log.dart';
import 'package:sem_mobile/features/audit/domain/repositories/audit_repository.dart';

abstract class AuditEvent extends Equatable {
  const AuditEvent();

  @override
  List<Object?> get props => [];
}

class AuditLoadRequested extends AuditEvent {
  final AuditLogFilter? filter;
  final bool refresh;

  const AuditLoadRequested({this.filter, this.refresh = false});

  @override
  List<Object?> get props => [filter, refresh];
}

class AuditLoadMoreRequested extends AuditEvent {
  const AuditLoadMoreRequested();
}

class AuditSearchRequested extends AuditEvent {
  final String query;

  const AuditSearchRequested(this.query);

  @override
  List<Object?> get props => [query];
}

class AuditFilterChanged extends AuditEvent {
  final AuditLogFilter filter;

  const AuditFilterChanged(this.filter);

  @override
  List<Object?> get props => [filter];
}

class AuditLogSelected extends AuditEvent {
  final AuditLog log;

  const AuditLogSelected(this.log);

  @override
  List<Object?> get props => [log];
}

class AuditLogDeselected extends AuditEvent {
  const AuditLogDeselected();
}

class AuditWebSocketEventReceived extends AuditEvent {
  final AuditLog log;
  final String eventType;

  const AuditWebSocketEventReceived({
    required this.log,
    required this.eventType,
  });

  @override
  List<Object?> get props => [log, eventType];
}

class AuditExportRequested extends AuditEvent {
  final String format;

  const AuditExportRequested({this.format = 'csv'});

  @override
  List<Object?> get props => [format];
}