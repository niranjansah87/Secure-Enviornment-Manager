import 'failures.dart';

/// Result type for operations that can fail
sealed class Result<T> {
  const Result();
}

final class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);
}

final class Error<T> extends Result<T> {
  final Failure failure;
  const Error(this.failure);
}

extension ResultExtension<T> on Result<T> {
  bool get isSuccess => this is Success<T>;
  bool get isError => this is Error<T>;

  T? get dataOrNull => switch (this) {
        Success(:final data) => data,
        Error() => null,
      };

  Failure? get failureOrNull => switch (this) {
        Success() => null,
        Error(:final failure) => failure,
      };

  R fold<R>({
    required R Function(T data) onSuccess,
    required R Function(Failure failure) onError,
  }) {
    return switch (this) {
      Success(:final data) => onSuccess(data),
      Error(:final failure) => onError(failure),
    };
  }

  R when<R>({
    required R Function(T data) success,
    required R Function(String message, String? code) error,
  }) {
    return switch (this) {
      Success(:final data) => success(data),
      Error(:final failure) => error(failure.message, failure.code),
    };
  }
}

/// Helper to convert a function that throws to Result
Result<T> runCatching<T>(T Function() operation) {
  try {
    return Success(operation());
  } on Failure catch (e) {
    return Error(e);
  } catch (e) {
    return Error(UnknownFailure(originalError: e));
  }
}

/// Async version of runCatching
Future<Result<T>> runCatchingAsync<T>(Future<T> Function() operation) async {
  try {
    return Success(await operation());
  } on Failure catch (e) {
    return Error(e);
  } catch (e) {
    return Error(UnknownFailure(originalError: e));
  }
}