/// Base state for BLoCs
abstract class BaseState {
  const BaseState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class InitialState extends BaseState {
  const InitialState();
}

/// Loading state with optional message
class LoadingState extends BaseState {
  final String? message;

  const LoadingState({this.message});

  @override
  List<Object?> get props => [message];
}

/// Success state with data
class SuccessState<T> extends BaseState {
  final T data;
  final String? message;

  const SuccessState({required this.data, this.message});

  @override
  List<Object?> get props => [data, message];
}

/// Error state with failure
class ErrorState extends BaseState {
  final String message;
  final String? code;

  const ErrorState({required this.message, this.code});

  @override
  List<Object?> get props => [message, code];
}