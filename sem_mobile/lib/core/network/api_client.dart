import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sem_mobile/core/constants/app_constants.dart';
import 'package:sem_mobile/core/environment/env_config.dart';
import 'package:sem_mobile/core/errors/failures.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/core/security/auth_coordinator.dart';

/// API client singleton with interceptors for JWT auth
/// Production-ready with proper token refresh and request queuing
class ApiClient {
  static ApiClient? _instance;
  late final Dio _dio;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  ApiClient._() {
    _dio = Dio(_baseOptions);
    _setupInterceptors();
    _initializeAuthCoordinator();
  }

  static ApiClient get instance {
    _instance ??= ApiClient._();
    return _instance!;
  }

  Dio get dio => _dio;

  BaseOptions get _baseOptions => BaseOptions(
        baseUrl: EnvConfig.instance.apiBaseUrl,
        connectTimeout: Duration(milliseconds: EnvConfig.instance.apiTimeout),
        receiveTimeout: Duration(milliseconds: EnvConfig.instance.apiTimeout),
        sendTimeout: Duration(milliseconds: EnvConfig.instance.apiTimeout),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      );

  void _initializeAuthCoordinator() {
    // Initialize auth coordinator with this client
    // Note: Full integration would require the auth repository to be set up
  }

  void _setupInterceptors() {
    _dio.interceptors.addAll([
      AuthInterceptor(_secureStorage, _dio),
      _PrettyDioLogger(),
    ]);
  }

  void updateBaseUrl(String baseUrl) {
    _dio.options.baseUrl = baseUrl;
  }

  Future<String?> getAccessToken() async {
    return _secureStorage.read(key: AppConstants.accessTokenKey);
  }

  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> clearAuth() async {
    await _secureStorage.delete(key: AppConstants.accessTokenKey);
    await _secureStorage.delete(key: AppConstants.refreshTokenKey);
  }
}

/// Auth interceptor with automatic token refresh
/// Handles race conditions and request queuing during refresh
class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _secureStorage;
  final Dio _dio;

  // Token refresh synchronization
  static bool _isRefreshing = false;
  static final List<_RequestCompleter> _pendingRequests = [];
  static DateTime? _lastRefreshAttempt;
  static const _refreshCooldown = Duration(seconds: 5);

  AuthInterceptor(this._secureStorage, this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth for auth endpoints
    if (_isAuthEndpoint(options.path)) {
      handler.next(options);
      return;
    }

    // Add authorization header
    final token = await _secureStorage.read(key: AppConstants.accessTokenKey);
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    // For requests during token refresh, queue them
    if (_isRefreshing) {
      final completer = _RequestCompleter(
        requestOptions: options,
        completer: Completer<Response>(),
      );
      _pendingRequests.add(completer);

      // Wait for refresh to complete
      completer.completer.future.then((response) {
        handler.resolve(response);
      }).catchError((error) {
        handler.reject(error as DioException);
      });

      return;
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Only handle 401 errors for non-auth endpoints
    if (err.response?.statusCode == 401 && !_isAuthEndpoint(err.requestOptions.path)) {
      _handleTokenRefresh(err, handler);
    } else {
      handler.next(err);
    }
  }

  Future<void> _handleTokenRefresh(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final refreshToken = await _secureStorage.read(key: AppConstants.refreshTokenKey);

    if (refreshToken == null || refreshToken.isEmpty) {
      AppLogger.instance.auth.warning('No refresh token available - logging out');
      // Clear tokens and trigger logout
      await _secureStorage.delete(key: AppConstants.accessTokenKey);
      await _secureStorage.delete(key: AppConstants.refreshTokenKey);
      _notifyAuthStateChange(false);
      handler.next(err);
      return;
    }

    // Check cooldown to prevent rapid refresh attempts
    if (_lastRefreshAttempt != null &&
        DateTime.now().difference(_lastRefreshAttempt!) < _refreshCooldown) {
      AppLogger.instance.auth.debug('Refresh on cooldown, queuing request');
      _queueRequest(err.requestOptions, handler);
      return;
    }

    // If already refreshing, queue the request
    if (_isRefreshing) {
      AppLogger.instance.auth.debug('Already refreshing, queuing request');
      _queueRequest(err.requestOptions, handler);
      return;
    }

    _isRefreshing = true;
    _lastRefreshAttempt = DateTime.now();

    try {
      AppLogger.instance.auth.info('Token expired, attempting refresh');

      final newTokens = await _refreshTokens(refreshToken);

      if (newTokens != null) {
        // Save new tokens
        await _secureStorage.write(
          key: AppConstants.accessTokenKey,
          value: newTokens['access_token'],
        );
        if (newTokens['refresh_token'] != null) {
          await _secureStorage.write(
            key: AppConstants.refreshTokenKey,
            value: newTokens['refresh_token'],
          );
        }

        AppLogger.instance.auth.info('Token refresh successful');

        // Process pending requests with new token
        await _processPendingRequests(newTokens['access_token']!);

        // Retry the original request
        final response = await _retryRequest(err.requestOptions, newTokens['access_token']!);
        handler.resolve(response);
      } else {
        throw Exception('Token refresh returned no data');
      }
    } catch (e) {
      AppLogger.instance.auth.error('Token refresh failed: $e');

      // Clear tokens on refresh failure
      await _secureStorage.delete(key: AppConstants.accessTokenKey);
      await _secureStorage.delete(key: AppConstants.refreshTokenKey);

      // Notify app of session expiration
      _notifyAuthStateChange(false);

      // Reject pending requests
      _rejectPendingRequests(err);

      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }

  void _queueRequest(RequestOptions requestOptions, ErrorInterceptorHandler handler) {
    final completer = _RequestCompleter(
      requestOptions: requestOptions,
      completer: Completer<Response>(),
    );
    _pendingRequests.add(completer);

    completer.completer.future.then((response) {
      handler.resolve(response);
    }).catchError((error) {
      handler.next(error as DioException);
    });
  }

  Future<void> _processPendingRequests(String accessToken) async {
    final requests = List<_RequestCompleter>.from(_pendingRequests);
    _pendingRequests.clear();

    for (final request in requests) {
      try {
        final response = await _retryRequest(request.requestOptions, accessToken);
        request.completer.complete(response);
      } catch (e) {
        request.completer.completeError(e);
      }
    }
  }

  void _rejectPendingRequests(DioException error) {
    final requests = List<_RequestCompleter>.from(_pendingRequests);
    _pendingRequests.clear();

    for (final request in requests) {
      request.completer.completeError(error);
    }
  }

  Future<Map<String, String>?> _refreshTokens(String refreshToken) async {
    try {
      // Use a fresh Dio instance to avoid interceptor loops
      final refreshDio = Dio(BaseOptions(
        baseUrl: EnvConfig.instance.apiBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));

      final response = await refreshDio.post(
        '/api/v1/auth/refresh',
        data: {'refresh_token': refreshToken},
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data is Map ? response.data as Map : {};
        if (data['success'] == true && data['data'] != null) {
          final dataMap = data['data'] as Map;
          return {
            'access_token': dataMap['access_token'] as String,
            'refresh_token': (dataMap['refresh_token'] as String?) ?? refreshToken,
          };
        }
      }
    } catch (e) {
      AppLogger.instance.auth.warning('Token refresh request failed: $e');
    }
    return null;
  }

  Future<Response<dynamic>> _retryRequest(
    RequestOptions requestOptions,
    String accessToken,
  ) async {
    final options = Options(
      method: requestOptions.method,
      headers: {
        ...requestOptions.headers,
        'Authorization': 'Bearer $accessToken',
      },
    );

    return _dio.fetch(requestOptions.copyWith(
      headers: {...requestOptions.headers, 'Authorization': 'Bearer $accessToken'},
    ));
  }

  bool _isAuthEndpoint(String path) {
    return path.contains('/auth/login') ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/logout');
  }

  void _notifyAuthStateChange(bool isAuthenticated) {
    try {
      AuthCoordinator.instance.onSessionExpired();
    } catch (_) {
      // AuthCoordinator might not be initialized yet
    }
  }
}

/// Internal class for tracking pending requests during token refresh
class _RequestCompleter {
  final RequestOptions requestOptions;
  final Completer<Response> completer;

  _RequestCompleter({required this.requestOptions, required this.completer});
}

/// Custom pretty dio logger - filters sensitive data
class _PrettyDioLogger extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Don't log sensitive data
    final sanitizedHeaders = Map<String, dynamic>.from(options.headers);
    if (sanitizedHeaders.containsKey('Authorization')) {
      sanitizedHeaders['Authorization'] = 'Bearer ***';
    }
    if (sanitizedHeaders.containsKey('X-API-Key')) {
      sanitizedHeaders['X-API-Key'] = '***';
    }

    AppLogger.instance.logNetworkRequest(
      options.method,
      options.uri.toString(),
      headers: sanitizedHeaders,
    );
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    // Don't log response bodies that might contain sensitive data
    AppLogger.instance.logNetworkResponse(
      response.statusCode ?? 0,
      response.requestOptions.uri.toString(),
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Don't log sensitive parts of error
    AppLogger.instance.logNetworkError(
      err.message ?? 'Unknown error',
      err.requestOptions.uri.toString(),
    );
    handler.next(err);
  }
}

/// Exception to Failure converter
Failure mapDioException(DioException e) {
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return NetworkFailure.timeout();
    case DioExceptionType.connectionError:
      return NetworkFailure.noConnection();
    case DioExceptionType.badResponse:
      final statusCode = e.response?.statusCode;
      if (statusCode == 401) return NetworkFailure.unauthorized();
      if (statusCode == 403) return NetworkFailure.forbidden();
      if (statusCode == 404) return NetworkFailure.notFound();
      return NetworkFailure.serverError(e.message);
    default:
      return NetworkFailure(message: e.message ?? 'Network error');
  }
}