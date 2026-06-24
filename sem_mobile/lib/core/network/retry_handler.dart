import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';

/// Retry policy for network requests
enum RetryPolicyType {
  none,
  linear,
  exponential,
  fibonacci,
}

/// Retry policy configuration
class RetryPolicy {
  final int maxAttempts;
  final Duration initialDelay;
  final Duration maxDelay;
  final RetryPolicyType type;

  const RetryPolicy({
    this.maxAttempts = 3,
    this.initialDelay = const Duration(milliseconds: 500),
    this.maxDelay = const Duration(seconds: 30),
    this.type = RetryPolicyType.exponential,
  });

  /// Get delay for a specific attempt (1-indexed)
  Duration getDelay(int attempt) {
    if (attempt <= 0 || attempt > maxAttempts) {
      return Duration.zero;
    }

    Duration delay;
    switch (type) {
      case RetryPolicyType.none:
        delay = Duration.zero;
        break;
      case RetryPolicyType.linear:
        delay = initialDelay * attempt;
        break;
      case RetryPolicyType.exponential:
        delay = initialDelay * (1 << (attempt - 1)); // 2^(n-1)
        break;
      case RetryPolicyType.fibonacci:
        delay = _fibonacciDelay(attempt);
        break;
    }

    // Cap at maxDelay
    return delay > maxDelay ? maxDelay : delay;
  }

  Duration _fibonacciDelay(int n) {
    // Fibonacci: 1, 1, 2, 3, 5, 8, 13, 21...
    if (n <= 2) return initialDelay;
    int a = 1, b = 1;
    for (int i = 3; i < n; i++) {
      final temp = a + b;
      a = b;
      b = temp;
    }
    return initialDelay * b;
  }

  /// Default API retry policy
  static const RetryPolicy defaultApi = RetryPolicy(
    maxAttempts: 3,
    initialDelay: Duration(milliseconds: 500),
    maxDelay: Duration(seconds: 10),
    type: RetryPolicyType.exponential,
  );

  /// Aggressive retry policy for critical operations
  static const RetryPolicy aggressive = RetryPolicy(
    maxAttempts: 5,
    initialDelay: Duration(milliseconds: 200),
    maxDelay: Duration(seconds: 30),
    type: RetryPolicyType.exponential,
  );

  /// No retry policy
  static const RetryPolicy noRetry = RetryPolicy(
    maxAttempts: 1,
    type: RetryPolicyType.none,
  );
}

/// Result of a retryable operation
sealed class RetryResult<T> {}

class RetrySuccess<T> extends RetryResult<T> {
  final T data;
  final int attempts;
  final Duration totalTime;

  RetrySuccess({required this.data, required this.attempts, required this.totalTime});
}

class RetryFailure<T> extends RetryResult<T> {
  final Object error;
  final int attempts;
  final Duration totalTime;

  RetryFailure({required this.error, required this.attempts, required this.totalTime});
}

/// Retry handler for network operations
class RetryHandler {
  static final RetryHandler _instance = RetryHandler._();
  static RetryHandler get instance => _instance;

  RetryHandler._();

  final AppLogger _logger = AppLogger.instance;

  /// Execute an operation with retry policy
  Future<RetryResult<T>> execute<T>({
    required Future<T> Function() operation,
    RetryPolicy policy = RetryPolicy.defaultApi,
    bool Function(Object error)? shouldRetry,
    void Function(int attempt, Object error)? onRetry,
  }) async {
    final startTime = DateTime.now();
    int attempts = 0;

    // Default retry condition: handle specific errors
    shouldRetry ??= (error) => _defaultShouldRetry(error);

    while (attempts < policy.maxAttempts) {
      attempts++;

      try {
        final result = await operation();
        return RetrySuccess(
          data: result,
          attempts: attempts,
          totalTime: DateTime.now().difference(startTime),
        );
      } catch (e) {
        final shouldRetryNow = shouldRetry(e);

        if (!shouldRetryNow || attempts >= policy.maxAttempts) {
          _logger.error('Operation failed after $attempts attempts: $e');
          return RetryFailure(
            error: e,
            attempts: attempts,
            totalTime: DateTime.now().difference(startTime),
          );
        }

        final delay = policy.getDelay(attempts);
        _logger.warning('Operation failed (attempt $attempts/${policy.maxAttempts}), retrying in ${delay.inMilliseconds}ms: $e');

        onRetry?.call(attempts, e);

        if (delay > Duration.zero) {
          await Future.delayed(delay);
        }
      }
    }

    // Should not reach here, but handle it
    return RetryFailure(
      error: Exception('Max retries exceeded'),
      attempts: attempts,
      totalTime: DateTime.now().difference(startTime),
    );
  }

  /// Default retry condition - retry on network errors, timeout, server errors
  bool _defaultShouldRetry(Object error) {
    final errorStr = error.toString().toLowerCase();

    // Don't retry on these errors
    if (errorStr.contains('unauthorized') ||
        errorStr.contains('forbidden') ||
        errorStr.contains('not found') ||
        errorStr.contains('validation')) {
      return false;
    }

    // Retry on network issues, timeouts, server errors
    if (errorStr.contains('socket') ||
        errorStr.contains('timeout') ||
        errorStr.contains('connection') ||
        errorStr.contains('network') ||
        errorStr.contains('server error') ||
        errorStr.contains('503') ||
        errorStr.contains('502') ||
        errorStr.contains('504')) {
      return true;
    }

    return false;
  }

  /// Execute with default retry policy
  Future<T> executeWithRetry<T>(
    Future<T> Function() operation, {
    RetryPolicy policy = RetryPolicy.defaultApi,
  }) async {
    final result = await execute(operation: operation, policy: policy);
    switch (result) {
      case RetrySuccess(data: final data):
        return data;
      case RetryFailure(error: final error):
        throw error;
    }
  }
}

/// Network resilience configuration
class NetworkResilienceConfig {
  final bool enableRetry;
  final bool enableOfflineQueue;
  final bool enableOptimisticUpdates;
  final int offlineQueueMaxSize;
  final Duration requestTimeout;

  const NetworkResilienceConfig({
    this.enableRetry = true,
    this.enableOfflineQueue = true,
    this.enableOptimisticUpdates = false,
    this.offlineQueueMaxSize = 100,
    this.requestTimeout = const Duration(seconds: 30),
  });

  static const NetworkResilienceConfig production = NetworkResilienceConfig(
    enableRetry: true,
    enableOfflineQueue: true,
    enableOptimisticUpdates: true,
    offlineQueueMaxSize: 100,
    requestTimeout: Duration(seconds: 30),
  );

  static const NetworkResilienceConfig development = NetworkResilienceConfig(
    enableRetry: true,
    enableOfflineQueue: false,
    enableOptimisticUpdates: false,
    requestTimeout: Duration(seconds: 10),
  );
}