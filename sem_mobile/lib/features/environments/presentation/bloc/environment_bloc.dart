import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:sem_mobile/core/errors/failures.dart';
import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/core/network/websocket_service.dart';
import 'package:sem_mobile/features/environments/domain/entities/environment.dart';
import 'package:sem_mobile/features/environments/domain/repositories/environment_repository.dart';

// Events
abstract class EnvironmentEvent extends Equatable {
  const EnvironmentEvent();

  @override
  List<Object?> get props => [];
}

class EnvironmentsLoadRequested extends EnvironmentEvent {
  final String? namespaceId;

  const EnvironmentsLoadRequested({this.namespaceId});

  @override
  List<Object?> get props => [namespaceId];
}

class EnvironmentSelected extends EnvironmentEvent {
  final Environment environment;

  const EnvironmentSelected(this.environment);

  @override
  List<Object?> get props => [environment];
}

class EnvironmentFavoriteToggled extends EnvironmentEvent {
  final String namespaceId;
  final String environmentId;

  const EnvironmentFavoriteToggled({
    required this.namespaceId,
    required this.environmentId,
  });

  @override
  List<Object?> get props => [namespaceId, environmentId];
}

class EnvironmentSearchRequested extends EnvironmentEvent {
  final String query;

  const EnvironmentSearchRequested(this.query);

  @override
  List<Object?> get props => [query];
}

class EnvironmentRefreshRequested extends EnvironmentEvent {
  const EnvironmentRefreshRequested();
}

class EnvironmentWebSocketEvent extends EnvironmentEvent {
  final WsEvent event;

  const EnvironmentWebSocketEvent(this.event);

  @override
  List<Object?> get props => [event];
}

// States
enum EnvironmentStatus { initial, loading, loaded, error }

class EnvironmentState extends Equatable {
  final EnvironmentStatus status;
  final List<Namespace> namespaces;
  final List<Environment> environments;
  final List<Environment> filteredEnvironments;
  final List<Environment> recentEnvironments;
  final List<Environment> favoriteEnvironments;
  final Namespace? selectedNamespace;
  final Environment? selectedEnvironment;
  final Failure? failure;
  final String searchQuery;

  const EnvironmentState({
    this.status = EnvironmentStatus.initial,
    this.namespaces = const [],
    this.environments = const [],
    this.filteredEnvironments = const [],
    this.recentEnvironments = const [],
    this.favoriteEnvironments = const [],
    this.selectedNamespace,
    this.selectedEnvironment,
    this.failure,
    this.searchQuery = '',
  });

  EnvironmentState copyWith({
    EnvironmentStatus? status,
    List<Namespace>? namespaces,
    List<Environment>? environments,
    List<Environment>? filteredEnvironments,
    List<Environment>? recentEnvironments,
    List<Environment>? favoriteEnvironments,
    Namespace? selectedNamespace,
    Environment? selectedEnvironment,
    Failure? failure,
    String? searchQuery,
  }) {
    return EnvironmentState(
      status: status ?? this.status,
      namespaces: namespaces ?? this.namespaces,
      environments: environments ?? this.environments,
      filteredEnvironments: filteredEnvironments ?? this.filteredEnvironments,
      recentEnvironments: recentEnvironments ?? this.recentEnvironments,
      favoriteEnvironments: favoriteEnvironments ?? this.favoriteEnvironments,
      selectedNamespace: selectedNamespace ?? this.selectedNamespace,
      selectedEnvironment: selectedEnvironment ?? this.selectedEnvironment,
      failure: failure,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }

  @override
  List<Object?> get props => [
        status,
        namespaces,
        environments,
        filteredEnvironments,
        recentEnvironments,
        favoriteEnvironments,
        selectedNamespace,
        selectedEnvironment,
        failure,
        searchQuery,
      ];
}

// BLoC - Production ready with WebSocket support
class EnvironmentBloc extends Bloc<EnvironmentEvent, EnvironmentState> {
  final EnvironmentRepository repository;
  final AppLogger _logger = AppLogger.instance;

  StreamSubscription<WsEvent>? _wsSubscription;

  EnvironmentBloc({required this.repository}) : super(const EnvironmentState()) {
    on<EnvironmentsLoadRequested>(_onLoadRequested);
    on<EnvironmentSelected>(_onSelected);
    on<EnvironmentFavoriteToggled>(_onFavoriteToggled);
    on<EnvironmentSearchRequested>(_onSearchRequested);
    on<EnvironmentRefreshRequested>(_onRefreshRequested);
    on<EnvironmentWebSocketEvent>(_onWebSocketEvent);

    _setupWebSocket();
  }

  void _setupWebSocket() {
    _wsSubscription = WebSocketService.instance.eventStream.listen((event) {
      add(EnvironmentWebSocketEvent(event));
    });
  }

  @override
  Future<void> close() {
    _wsSubscription?.cancel();
    return super.close();
  }

  Future<void> _onLoadRequested(
    EnvironmentsLoadRequested event,
    Emitter<EnvironmentState> emit,
  ) async {
    emit(state.copyWith(status: EnvironmentStatus.loading));

    try {
      // Load namespaces
      final namespacesResult = await repository.getNamespaces();

      switch (namespacesResult) {
        case Success(data: final data):
          final selectedNamespace = event.namespaceId != null
              ? data.firstWhere(
                  (n) => n.id == event.namespaceId,
                  orElse: () => data.first,
                )
              : data.isNotEmpty
                  ? data.first
                  : null;

          emit(state.copyWith(
            namespaces: data,
            selectedNamespace: selectedNamespace,
          ));

          // Load environments for selected namespace
          if (selectedNamespace != null) {
            await _loadEnvironments(selectedNamespace.id, emit);
          } else {
            emit(state.copyWith(status: EnvironmentStatus.loaded));
          }

        case Error(:final failure):
          emit(state.copyWith(
            status: EnvironmentStatus.error,
            failure: failure,
          ));
      }

      // Load recent and favorites in parallel
      await Future.wait([
        _loadRecentEnvironments(emit),
        _loadFavoriteEnvironments(emit),
      ]);
    } catch (e, stack) {
      _logger.error('Failed to load environments: $e\nStack: $stack');
      emit(state.copyWith(
        status: EnvironmentStatus.error,
        failure: UnknownFailure(originalError: e),
      ));
    }
  }

  Future<void> _loadEnvironments(
    String namespaceId,
    Emitter<EnvironmentState> emit,
  ) async {
    try {
      final result = await repository.getEnvironments(namespaceId);

      switch (result) {
        case Success(data: final data):
          emit(state.copyWith(
            status: EnvironmentStatus.loaded,
            environments: data,
            filteredEnvironments: _filterEnvironments(data, state.searchQuery),
          ));

        case Error(:final failure):
          emit(state.copyWith(
            status: EnvironmentStatus.error,
            failure: failure,
          ));
      }
    } catch (e, stack) {
      _logger.error('Failed to load environments: $e\nStack: $stack');
    }
  }

  Future<void> _loadRecentEnvironments(Emitter<EnvironmentState> emit) async {
    try {
      final result = await repository.getRecentEnvironments();
      switch (result) {
        case Success(data: final data):
          emit(state.copyWith(recentEnvironments: data));
        case Error():
          break;
      }
    } catch (e, stack) {
      _logger.error('Failed to load recent environments: $e\nStack: $stack');
    }
  }

  Future<void> _loadFavoriteEnvironments(Emitter<EnvironmentState> emit) async {
    try {
      final result = await repository.getFavoriteEnvironments();
      switch (result) {
        case Success(data: final data):
          emit(state.copyWith(favoriteEnvironments: data));
        case Error():
          break;
      }
    } catch (e, stack) {
      _logger.error('Failed to load favorite environments: $e\nStack: $stack');
    }
  }

  Future<void> _onSelected(
    EnvironmentSelected event,
    Emitter<EnvironmentState> emit,
  ) async {
    emit(state.copyWith(selectedEnvironment: event.environment));
  }

  Future<void> _onFavoriteToggled(
    EnvironmentFavoriteToggled event,
    Emitter<EnvironmentState> emit,
  ) async {
    try {
      final result = await repository.toggleFavorite(
        event.namespaceId,
        event.environmentId,
      );

      switch (result) {
        case Success(data: final env):
          final updatedEnvironments = state.environments.map((e) {
            return e.id == env.id ? env : e;
          }).toList();

          final updatedFavorites = env.isFavorite
              ? <Environment>[...state.favoriteEnvironments, env]
              : state.favoriteEnvironments
                  .where((e) => e.id != env.id)
                  .toList();

          emit(state.copyWith(
            environments: updatedEnvironments,
            filteredEnvironments: _filterEnvironments(updatedEnvironments, state.searchQuery),
            favoriteEnvironments: updatedFavorites,
          ));

        case Error():
          break;
      }
    } catch (e, stack) {
      _logger.error('Failed to toggle favorite: $e\nStack: $stack');
    }
  }

  Future<void> _onSearchRequested(
    EnvironmentSearchRequested event,
    Emitter<EnvironmentState> emit,
  ) async {
    final filtered = _filterEnvironments(state.environments, event.query);
    emit(state.copyWith(
      searchQuery: event.query,
      filteredEnvironments: filtered,
    ));
  }

  Future<void> _onRefreshRequested(
    EnvironmentRefreshRequested event,
    Emitter<EnvironmentState> emit,
  ) async {
    if (state.selectedNamespace != null) {
      await _loadEnvironments(state.selectedNamespace!.id, emit);
    }
  }

  Future<void> _onWebSocketEvent(
    EnvironmentWebSocketEvent event,
    Emitter<EnvironmentState> emit,
  ) async {
    final wsEvent = event.event;

    switch (wsEvent.type) {
      case WsEventType.environmentUpdated:
        _logger.debug('WebSocket: Environment updated');
        if (wsEvent.namespaceId == state.selectedNamespace?.id) {
          // Refresh environments
          if (state.selectedNamespace != null) {
            await _loadEnvironments(state.selectedNamespace!.id, emit);
          }
        }
        break;

      case WsEventType.sessionRevoked:
        _logger.warning('WebSocket: Session revoked');
        // Clear environments
        emit(const EnvironmentState());
        break;

      default:
        break;
    }
  }

  List<Environment> _filterEnvironments(List<Environment> environments, String query) {
    if (query.isEmpty) return environments;
    final lowerQuery = query.toLowerCase();
    return environments.where((e) {
      return e.name.toLowerCase().contains(lowerQuery) ||
          (e.description?.toLowerCase().contains(lowerQuery) ?? false);
    }).toList();
  }
}