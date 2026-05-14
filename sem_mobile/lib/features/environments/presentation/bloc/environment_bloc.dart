import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:sem_mobile/core/errors/failures.dart';
import 'package:sem_mobile/core/errors/result.dart';
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

// BLoC
class EnvironmentBloc extends Bloc<EnvironmentEvent, EnvironmentState> {
  final EnvironmentRepository repository;

  EnvironmentBloc({required this.repository}) : super(const EnvironmentState()) {
    on<EnvironmentsLoadRequested>(_onLoadRequested);
    on<EnvironmentSelected>(_onSelected);
    on<EnvironmentFavoriteToggled>(_onFavoriteToggled);
    on<EnvironmentSearchRequested>(_onSearchRequested);
    on<EnvironmentRefreshRequested>(_onRefreshRequested);
  }

  Future<void> _onLoadRequested(
    EnvironmentsLoadRequested event,
    Emitter<EnvironmentState> emit,
  ) async {
    emit(state.copyWith(status: EnvironmentStatus.loading));

    // Load namespaces
    final namespacesResult = await repository.getNamespaces();

    switch (namespacesResult) {
      case Success(:final data):
        emit(state.copyWith(
          namespaces: data,
          selectedNamespace: event.namespaceId != null
              ? data.firstWhere(
                  (n) => n.id == event.namespaceId,
                  orElse: () => data.first,
                )
              : data.isNotEmpty
                  ? data.first
                  : null,
        ));

        // Load environments for selected namespace
        if (state.selectedNamespace != null) {
          await _loadEnvironments(
            state.selectedNamespace!.id,
            emit,
          );
        }

      case Error(:final failure):
        emit(state.copyWith(
          status: EnvironmentStatus.error,
          failure: failure,
        ));
    }

    // Load recent and favorites
    final recentResult = await repository.getRecentEnvironments();
    switch (recentResult) {
      case Success(:final data):
        emit(state.copyWith(recentEnvironments: data));
      case Error():
        break;
    }

    final favoritesResult = await repository.getFavoriteEnvironments();
    switch (favoritesResult) {
      case Success(:final data):
        emit(state.copyWith(favoriteEnvironments: data));
      case Error():
        break;
    }
  }

  Future<void> _loadEnvironments(
    String namespaceId,
    Emitter<EnvironmentState> emit,
  ) async {
    final result = await repository.getEnvironments(namespaceId);

    switch (result) {
      case Success(:final data):
        emit(state.copyWith(
          status: EnvironmentStatus.loaded,
          environments: data,
          filteredEnvironments: data,
        ));

      case Error(:final failure):
        emit(state.copyWith(
          status: EnvironmentStatus.error,
          failure: failure,
        ));
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
    final result = await repository.toggleFavorite(
      event.namespaceId,
      event.environmentId,
    );

    switch (result) {
      case Success(:final updated):
        final updatedEnvironments = state.environments.map((e) {
          return e.id == updated.id ? updated : e;
        }).toList();

        final updatedFavorites = updated.isFavorite
            ? [...state.favoriteEnvironments, updated]
            : state.favoriteEnvironments
                .where((e) => e.id != updated.id)
                .toList();

        emit(state.copyWith(
          environments: updatedEnvironments,
          filteredEnvironments: _filterEnvironments(updatedEnvironments, state.searchQuery),
          favoriteEnvironments: updatedFavorites,
        ));

      case Error():
        break;
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

  List<Environment> _filterEnvironments(List<Environment> environments, String query) {
    if (query.isEmpty) return environments;
    final lowerQuery = query.toLowerCase();
    return environments.where((e) {
      return e.name.toLowerCase().contains(lowerQuery) ||
          (e.description?.toLowerCase().contains(lowerQuery) ?? false);
    }).toList();
  }
}