import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:sem_mobile/core/errors/failures.dart';
import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/features/auth/domain/entities/auth.dart';
import 'package:sem_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:sem_mobile/core/security/security_service.dart';

/// Centralized auth coordinator for managing authentication state
/// Handles token refresh, request queuing, and session management
class AuthCoordinator {
  static AuthCoordinator? _instance;
  static AuthCoordinator get instance {
    _instance ??= AuthCoordinator._();
    return _instance!;
  }

  AuthCoordinator._();

  final AppLogger _logger = AppLogger.instance;
  AuthRepository? _authRepository;
  SecurityService? _securityService;

  bool _isRefreshing = false;
  bool _isAuthenticated = false;
  bool _sessionExpired = false;
  Timer? _refreshTimer;

  // Queue of pending requests waiting for token refresh
  final List<_PendingRequest> _pendingRequests = [];

  // Listeners for auth state changes
  final List<void Function(bool isAuthenticated)> _authStateListeners = [];
  final List<void Function()> _sessionExpiredListeners = [];
  final List<void Function(AuthTokens tokens)> _tokenRefreshedListeners = [];

  /// Initialize with dependencies
  void initialize({
    required AuthRepository authRepository,
    required SecurityService securityService,
  }) {
    _authRepository = authRepository;
    _securityService = securityService;
    _logger.info('AuthCoordinator initialized');
  }

  bool get isAuthenticated => _isAuthenticated;
  bool get isRefreshing => _isRefreshing;
  bool get sessionExpired => _sessionExpired;

  /// Check if user is authenticated
  Future<bool> checkAuthStatus() async {
    if (_sessionExpired) return false;

    try {
      final result = await _authRepository!.isAuthenticated();
      switch (result) {
        case Success(data: final isAuth):
          _isAuthenticated = isAuth;
          return isAuth;
        case Error():
          _isAuthenticated = false;
          return false;
      }
    } catch (e) {
      _logger.error('Auth check failed: $e');
      _isAuthenticated = false;
      return false;
    }
  }

  /// Register an auth state listener
  void addAuthStateListener(void Function(bool) listener) {
    _authStateListeners.add(listener);
  }

  /// Remove an auth state listener
  void removeAuthStateListener(void Function(bool) listener) {
    _authStateListeners.remove(listener);
  }

  /// Register a session expired listener
  void addSessionExpiredListener(void Function() listener) {
    _sessionExpiredListeners.add(listener);
  }

  /// Register a token refreshed listener
  void addTokenRefreshedListener(void Function(AuthTokens) listener) {
    _tokenRefreshedListeners.add(listener);
  }

  /// Refresh the access token
  /// Returns the new tokens if successful, throws if failed
  Future<AuthTokens> refreshToken() async {
    if (_isRefreshing) {
      // Wait for ongoing refresh to complete
      _logger.debug('Waiting for ongoing token refresh');
      return _waitForRefresh();
    }

    _isRefreshing = true;
    _logger.info('Starting token refresh');

    try {
      final result = await _authRepository!.refreshToken();
      switch (result) {
        case Success(data: final tokens):
          _isRefreshing = false;
          _sessionExpired = false;
          _scheduleRefresh(tokens);
          _notifyTokenRefreshed(tokens);
          _logger.info('Token refresh successful');
          return tokens;
        case Error():
          _isRefreshing = false;
          _handleRefreshFailure();
          throw AuthFailure.sessionExpired();
      }
    } catch (e) {
      _isRefreshing = false;
      _handleRefreshFailure();
      rethrow;
    }
  }

  /// Handle successful authentication (login)
  Future<void> onAuthenticated(AuthResponse response) async {
    _isAuthenticated = true;
    _sessionExpired = false;
    _scheduleRefresh(response.tokens);
    _notifyAuthStateChanged(true);
    _logger.info('User authenticated');
  }

  /// Handle logout
  Future<void> onLogout() async {
    _cancelRefreshTimer();
    _isAuthenticated = false;
    _sessionExpired = false;
    _pendingRequests.clear();
    _notifyAuthStateChanged(false);
    _logger.info('User logged out');
  }

  /// Handle session expiration
  void onSessionExpired() {
    _cancelRefreshTimer();
    _isAuthenticated = false;
    _sessionExpired = true;
    _pendingRequests.clear();
    _notifySessionExpired();
    _logger.warning('Session expired');
  }

  /// Execute a request with automatic token handling
  /// If token is expired, it will refresh first
  Future<T> executeWithAuth<T>(Future<T> Function() request) async {
    if (_sessionExpired) {
      throw AuthFailure.sessionExpired();
    }

    try {
      return await request();
    } on AuthFailure catch (e) {
      if (e.code == 'SESSION_EXPIRED' || e.code == 'UNAUTHORIZED') {
        // Token might be expired, try to refresh
        if (!_isRefreshing) {
          try {
            await refreshToken();
            return await request();
          } catch (_) {
            onSessionExpired();
            rethrow;
          }
        } else {
          // Wait for refresh and retry
          await _waitForRefresh();
          return await request();
        }
      }
      rethrow;
    } catch (e) {
      rethrow;
    }
  }

  /// Queue a request to be executed after token refresh
  Future<T> queueRequest<T>(Future<T> Function() request) async {
    if (_sessionExpired) {
      throw AuthFailure.sessionExpired();
    }

    if (!_isRefreshing) {
      return request();
    }

    // Create completer to resolve when refresh completes
    final completer = Completer<T>();
    _pendingRequests.add(_PendingRequest<T>(
      request: request,
      completer: completer,
    ));
    return completer.future;
  }

  void _scheduleRefresh(AuthTokens tokens) {
    _cancelRefreshTimer();

    if (tokens.expiresAt == null) {
      // Default refresh 5 minutes before expiry
      const defaultExpiry = Duration(minutes: 30);
      final refreshIn = defaultExpiry - const Duration(minutes: 5);
      _refreshTimer = Timer(refreshIn, () {
        _executeScheduledRefresh();
      });
    } else {
      final expiresAt = tokens.expiresAt!;
      final now = DateTime.now();
      final timeUntilExpiry = expiresAt.difference(now);

      if (timeUntilExpiry.isNegative) {
        // Already expired, refresh now
        _executeScheduledRefresh();
      } else if (timeUntilExpiry.inMinutes <= 5) {
        // Less than 5 minutes, refresh now
        _executeScheduledRefresh();
      } else {
        // Refresh 5 minutes before expiry
        final refreshIn = timeUntilExpiry - const Duration(minutes: 5);
        _refreshTimer = Timer(refreshIn, () {
          _executeScheduledRefresh();
        });
      }
    }
  }

  Future<void> _executeScheduledRefresh() async {
    try {
      await refreshToken();
    } catch (e) {
      _logger.error('Scheduled token refresh failed: $e');
    }
  }

  void _cancelRefreshTimer() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }

  Future<T> _waitForRefresh<T>() async {
    // Wait up to 30 seconds for refresh to complete
    final startTime = DateTime.now();
    while (_isRefreshing && DateTime.now().difference(startTime).inSeconds < 30) {
      await Future.delayed(const Duration(milliseconds: 100));
    }

    if (_sessionExpired) {
      throw AuthFailure.sessionExpired();
    }

    if (_isRefreshing) {
      _logger.warning('Refresh timeout, treating as expired');
      onSessionExpired();
      throw AuthFailure.sessionExpired();
    }

    return Future.error(AuthFailure.sessionExpired());
  }

  void _handleRefreshFailure() {
    onSessionExpired();
  }

  void _notifyAuthStateChanged(bool isAuthenticated) {
    for (final listener in _authStateListeners) {
      try {
        listener(isAuthenticated);
      } catch (e) {
        _logger.error('Auth state listener error: $e');
      }
    }
  }

  void _notifySessionExpired() {
    for (final listener in _sessionExpiredListeners) {
      try {
        listener();
      } catch (e) {
        _logger.error('Session expired listener error: $e');
      }
    }
  }

  void _notifyTokenRefreshed(AuthTokens tokens) {
    for (final listener in _tokenRefreshedListeners) {
      try {
        listener(tokens);
      } catch (e) {
        _logger.error('Token refreshed listener error: $e');
      }
    }
  }

  /// Process pending requests after token refresh
  void _processPendingRequests() {
    for (final pending in _pendingRequests) {
      pending.request().then(
        pending.completer.complete,
        onError: pending.completer.completeError,
      );
    }
    _pendingRequests.clear();
  }

  /// Resolve all pending requests with an error (session expired)
  void _resolvePendingWithError(Object error) {
    for (final pending in _pendingRequests) {
      pending.completer.completeError(error);
    }
    _pendingRequests.clear();
  }

  void dispose() {
    _cancelRefreshTimer();
    _pendingRequests.clear();
    _authStateListeners.clear();
    _sessionExpiredListeners.clear();
    _tokenRefreshedListeners.clear();
    _instance = null;
  }
}

/// Internal class for tracking pending requests
class _PendingRequest<T> {
  final Future<T> Function() request;
  final Completer<T> completer;

  _PendingRequest({required this.request, required this.completer});
}