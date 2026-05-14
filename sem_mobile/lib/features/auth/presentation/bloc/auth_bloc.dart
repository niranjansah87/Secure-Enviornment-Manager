import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:sem_mobile/core/errors/failures.dart';
import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/core/security/security_service.dart';
import 'package:sem_mobile/features/auth/domain/entities/auth.dart';
import 'package:sem_mobile/features/auth/domain/repositories/auth_repository.dart';

// Events
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

class AuthLoginRequested extends AuthEvent {
  final String username;
  final String password;

  const AuthLoginRequested({
    required this.username,
    required this.password,
  });

  @override
  List<Object?> get props => [username, password];
}

class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

class AuthBiometricRequested extends AuthEvent {
  const AuthBiometricRequested();
}

class AuthSessionExpired extends AuthEvent {
  const AuthSessionExpired();
}

// States
enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState extends Equatable {
  final AuthStatus status;
  final Failure? failure;
  final User? user;
  final bool biometricAvailable;

  const AuthState({
    this.status = AuthStatus.initial,
    this.failure,
    this.user,
    this.biometricAvailable = false,
  });

  AuthState copyWith({
    AuthStatus? status,
    Failure? failure,
    bool? biometricAvailable,
    User? user,
  }) {
    return AuthState(
      status: status ?? this.status,
      failure: failure,
      biometricAvailable: biometricAvailable ?? this.biometricAvailable,
      user: user ?? this.user,
    );
  }

  @override
  List<Object?> get props => [status, failure, user, biometricAvailable];
}

// BLoC
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository authRepository;
  final SecurityService securityService;

  AuthBloc({
    required this.authRepository,
    required this.securityService,
  }) : super(const AuthState()) {
    on<AuthCheckRequested>(_onCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
    on<AuthBiometricRequested>(_onBiometricRequested);
    on<AuthSessionExpired>(_onSessionExpired);
  }

  Future<void> _onCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading));

    final result = await authRepository.isAuthenticated();
    final biometricAvailable = await securityService.isBiometricAvailable();

    switch (result) {
      case Success(:final data):
        if (data) {
          // Try to get user profile
          final userResult = await authRepository.getCurrentUser();
          switch (userResult) {
            case Success(data: final user):
              emit(state.copyWith(
                status: AuthStatus.authenticated,
                user: user,
                biometricAvailable: biometricAvailable,
              ));
            case Error():
              emit(state.copyWith(
                status: AuthStatus.authenticated,
                biometricAvailable: biometricAvailable,
              ));
          }
        } else {
          emit(state.copyWith(
            status: AuthStatus.unauthenticated,
            biometricAvailable: biometricAvailable,
          ));
        }

      case Error(:final failure):
        emit(state.copyWith(
          status: AuthStatus.unauthenticated,
          failure: failure,
          biometricAvailable: biometricAvailable,
        ));
    }
  }

  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading, failure: null));

    final result = await authRepository.login(
      LoginCredentials(
        username: event.username,
        password: event.password,
      ),
    );

    switch (result) {
      case Success(:final data):
        emit(state.copyWith(
          status: AuthStatus.authenticated,
          user: data.user,
        ));

      case Error(:final failure):
        emit(state.copyWith(
          status: AuthStatus.error,
          failure: failure,
        ));
    }
  }

  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading));

    await authRepository.logout();

    emit(state.copyWith(
      status: AuthStatus.unauthenticated,
      user: null,
    ));
  }

  Future<void> _onBiometricRequested(
    AuthBiometricRequested event,
    Emitter<AuthState> emit,
  ) async {
    final result = await securityService.authenticateWithBiometrics();

    switch (result) {
      case Success():
        // Try to get user profile after biometric auth
        final userResult = await authRepository.getCurrentUser();
        switch (userResult) {
          case Success(data: final user):
            emit(state.copyWith(
              status: AuthStatus.authenticated,
              user: user,
            ));
          case Error():
            emit(state.copyWith(status: AuthStatus.authenticated));
        }

      case Error(:final failure):
        emit(state.copyWith(
          status: AuthStatus.error,
          failure: failure,
        ));
    }
  }

  Future<void> _onSessionExpired(
    AuthSessionExpired event,
    Emitter<AuthState> emit,
  ) async {
    await authRepository.logout();
    emit(state.copyWith(
      status: AuthStatus.unauthenticated,
      user: null,
      failure: AuthFailure.sessionExpired(),
    ));
  }
}