import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/features/audit/domain/entities/audit_log.dart';
import 'package:sem_mobile/features/audit/domain/repositories/audit_repository.dart';
import 'package:sem_mobile/features/audit/presentation/bloc/audit_event.dart';
import 'package:sem_mobile/features/audit/presentation/bloc/audit_state.dart';

class AuditBloc extends Bloc<AuditEvent, AuditState> {
  final AuditRepository _repository;
  final AppLogger _logger = AppLogger.instance;

  AuditBloc({required AuditRepository repository})
      : _repository = repository,
        super(const AuditState()) {
    on<AuditLoadRequested>(_onLoadRequested);
    on<AuditLoadMoreRequested>(_onLoadMoreRequested);
    on<AuditSearchRequested>(_onSearchRequested);
    on<AuditFilterChanged>(_onFilterChanged);
    on<AuditLogSelected>(_onLogSelected);
    on<AuditLogDeselected>(_onLogDeselected);
    on<AuditWebSocketEventReceived>(_onWebSocketEventReceived);
    on<AuditExportRequested>(_onExportRequested);
  }

  Future<void> _onLoadRequested(
    AuditLoadRequested event,
    Emitter<AuditState> emit,
  ) async {
    if (event.refresh) {
      emit(state.copyWith(
        status: AuditStatus.loading,
        filter: event.filter ?? state.filter,
        clearError: true,
      ));
    } else if (state.status == AuditStatus.loading) {
      return;
    } else {
      emit(state.copyWith(
        status: AuditStatus.loading,
        filter: event.filter ?? state.filter,
        clearError: true,
      ));
    }

    try {
      final effectiveFilter = event.filter ?? state.filter;
      final result = await _repository.getAuditLogs(effectiveFilter);

      switch (result) {
        case Success(data: final logs):
          emit(state.copyWith(
            status: AuditStatus.success,
            logs: logs,
            hasReachedMax: logs.length < effectiveFilter.limit,
          ));
        case Error(failure: final failure):
          _logger.error('Failed to load audit logs: ${failure.message}');
          emit(state.copyWith(
            status: AuditStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error loading audit logs: $e\n$stack');
      emit(state.copyWith(
        status: AuditStatus.failure,
        errorMessage: 'Failed to load audit logs',
      ));
    }
  }

  Future<void> _onLoadMoreRequested(
    AuditLoadMoreRequested event,
    Emitter<AuditState> emit,
  ) async {
    if (state.hasReachedMax || state.status == AuditStatus.loading) {
      return;
    }

    emit(state.copyWith(status: AuditStatus.loading));

    try {
      final nextFilter = state.filter.copyWith(
        offset: state.logs.length,
      );

      final result = await _repository.getAuditLogs(nextFilter);

      switch (result) {
        case Success(data: final logs):
          emit(state.copyWith(
            status: AuditStatus.success,
            logs: [...state.logs, ...logs],
            hasReachedMax: logs.length < nextFilter.limit,
          ));
        case Error(failure: final failure):
          _logger.error('Failed to load more audit logs: ${failure.message}');
          emit(state.copyWith(
            status: AuditStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error loading more audit logs: $e\n$stack');
      emit(state.copyWith(
        status: AuditStatus.failure,
        errorMessage: 'Failed to load more audit logs',
      ));
    }
  }

  Future<void> _onSearchRequested(
    AuditSearchRequested event,
    Emitter<AuditState> emit,
  ) async {
    if (event.query.isEmpty) {
      emit(state.copyWith(
        clearSearchQuery: true,
        status: AuditStatus.loading,
      ));
      add(AuditLoadRequested(filter: state.filter));
      return;
    }

    emit(state.copyWith(
      status: AuditStatus.loading,
      searchQuery: event.query,
    ));

    try {
      final result = await _repository.searchAuditLogs(event.query);

      switch (result) {
        case Success(data: final logs):
          emit(state.copyWith(
            status: AuditStatus.success,
            logs: logs,
            hasReachedMax: true,
          ));
        case Error(failure: final failure):
          _logger.error('Failed to search audit logs: ${failure.message}');
          emit(state.copyWith(
            status: AuditStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error searching audit logs: $e\n$stack');
      emit(state.copyWith(
        status: AuditStatus.failure,
        errorMessage: 'Failed to search audit logs',
      ));
    }
  }

  void _onFilterChanged(
    AuditFilterChanged event,
    Emitter<AuditState> emit,
  ) {
    emit(state.copyWith(filter: event.filter));
    add(AuditLoadRequested(filter: event.filter, refresh: true));
  }

  void _onLogSelected(
    AuditLogSelected event,
    Emitter<AuditState> emit,
  ) {
    emit(state.copyWith(selectedLog: event.log));
  }

  void _onLogDeselected(
    AuditLogDeselected event,
    Emitter<AuditState> emit,
  ) {
    emit(state.copyWith(clearSelectedLog: true));
  }

  void _onWebSocketEventReceived(
    AuditWebSocketEventReceived event,
    Emitter<AuditState> emit,
  ) {
    _logger.debug('Received WebSocket audit event: ${event.eventType}');

    // Prepend new event to logs list
    final updatedLogs = [event.log, ...state.logs];

    // Keep only the most recent 100 logs in memory
    final trimmedLogs = updatedLogs.length > 100
        ? updatedLogs.sublist(0, 100)
        : updatedLogs;

    emit(state.copyWith(logs: trimmedLogs));
  }

  Future<void> _onExportRequested(
    AuditExportRequested event,
    Emitter<AuditState> emit,
  ) async {
    emit(state.copyWith(status: AuditStatus.exporting));

    try {
      final result = await _repository.exportAuditLogs(state.filter, event.format);

      switch (result) {
        case Success(data: final url):
          emit(state.copyWith(
            status: AuditStatus.exported,
            exportUrl: url,
          ));
        case Error(failure: final failure):
          _logger.error('Failed to export audit logs: ${failure.message}');
          emit(state.copyWith(
            status: AuditStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error exporting audit logs: $e\n$stack');
      emit(state.copyWith(
        status: AuditStatus.failure,
        errorMessage: 'Failed to export audit logs',
      ));
    }
  }
}