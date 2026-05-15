import 'dart:async';
import 'dart:isolate';
import 'package:flutter/foundation.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/core/security/lifecycle_security_manager.dart';

/// Global error handler for the application
class GlobalErrorHandler {
  static final GlobalErrorHandler _instance = GlobalErrorHandler._();
  static GlobalErrorHandler get instance => _instance;

  GlobalErrorHandler._();

  final AppLogger _logger = AppLogger.instance;

  /// Initialize global error handlers
  void initialize() {
    // Set up Flutter error handling
    FlutterError.onError = _handleFlutterError;
    Isolate.current.addErrorListener(_handleIsolateError);

    _logger.info('Global error handlers initialized');
  }

  /// Handle Flutter framework errors
  void _handleFlutterError(FlutterErrorDetails details) {
    // Log the error
    _logger.error('Flutter error: ${details.exceptionAsString()}');

    // Don't log silent errors (common in production)
    if (details.silent) {
      return;
    }

    // Log stack trace if available
    if (details.stack != null) {
      _logger.debug('Stack trace: ${details.stack}');
    }

    // In production, would send to crash reporting service
    _reportError(details);
  }

  /// Handle isolate errors
  void _handleIsolateError(dynamic error) {
    _logger.error('Isolate error: $error');
    _reportError(error);
  }

  /// Report error to crash reporting service
  void _reportError(dynamic error) {
    // In production, would send to Sentry or similar
    if (kDebugMode) {
      debugPrint('Error reported: $error');
    }
  }

  /// Handle async errors
  Future<void> handleAsyncError(Object error, StackTrace stackTrace) async {
    _logger.error('Async error: $error\nStack: $stackTrace');
    _reportError(error);
  }

  /// Wrap a function with error handling
  T? wrap<T>(T? Function() fn, {T? fallback}) {
    try {
      return fn();
    } catch (e, stack) {
      _logger.error('Wrapped error: $e\nStack: $stack');
      return fallback;
    }
  }

  /// Wrap an async function with error handling
  Future<T?> wrapAsync<T>(Future<T?> Function() fn, {T? fallback}) async {
    try {
      return await fn();
    } catch (e, stack) {
      _logger.error('Wrapped async error: $e\nStack: $stack');
      return fallback;
    }
  }
}

/// Production BLoC observer with logging
class ProductionBlocObserver {
  static final ProductionBlocObserver _instance = ProductionBlocObserver._();
  static ProductionBlocObserver get instance => _instance;

  ProductionBlocObserver._();

  final AppLogger _logger = AppLogger.instance;
  final Set<String> _subscribedBlocs = {};

  /// Track a bloc for observation
  void track(String blocName) {
    _subscribedBlocs.add(blocName);
  }

  /// Stop tracking a bloc
  void untrack(String blocName) {
    _subscribedBlocs.remove(blocName);
  }

  /// Called when a bloc is created
  void onCreate(String blocName) {
    if (_subscribedBlocs.contains(blocName)) {
      _logger.debug('[BLoC] Created: $blocName');
    }
  }

  /// Called when a bloc is closed
  void onClose(String blocName) {
    if (_subscribedBlocs.contains(blocName)) {
      _logger.debug('[BLoC] Closed: $blocName');
    }
  }

  /// Called when an event is added to a bloc
  void onEvent(String blocName, dynamic event) {
    if (_subscribedBlocs.contains(blocName)) {
      _logger.debug('[BLoC] Event: $blocName -> $event');
    }
  }

  /// Called when a new state is emitted
  void onTransition(String blocName, dynamic transition) {
    if (_subscribedBlocs.contains(blocName)) {
      _logger.debug('[BLoC] Transition: $blocName -> $transition');
    }
  }

  /// Called when an error occurs in a bloc
  void onError(String blocName, Object error, StackTrace stackTrace) {
    _logger.error('[BLoC] Error in $blocName: $error\nStack: $stackTrace');
  }

  /// Get debug info for all tracked blocs
  Map<String, dynamic> getDebugInfo() {
    return {
      'tracked_blocs': _subscribedBlocs.toList(),
      'count': _subscribedBlocs.length,
    };
  }
}