import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sem_mobile/core/constants/app_constants.dart';
import 'package:sem_mobile/core/environment/env_config.dart';
import 'package:sem_mobile/core/errors/failures.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';

/// API client singleton with interceptors for JWT auth
class ApiClient {
  static ApiClient? _instance;
  late final Dio _dio;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  ApiClient._() {
    _dio = Dio(_baseOptions);
    _setupInterceptors();
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
class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _secureStorage;
  final Dio _dio;
  bool _isRefreshing = false;

  AuthInterceptor(this._secureStorage, this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (_isAuthEndpoint(options.path)) {
      handler.next(options);
      return;
    }

    final token = await _secureStorage.read(key: AppConstants.accessTokenKey);
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401 &&
        !_isAuthEndpoint(err.requestOptions.path)) {
      _handleTokenRefresh(err, handler);
    } else {
      handler.next(err);
    }
  }

  Future<void> _handleTokenRefresh(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final refreshToken =
        await _secureStorage.read(key: AppConstants.refreshTokenKey);

    if (refreshToken == null || refreshToken.isEmpty) {
      AppLogger.instance.auth.warning('No refresh token available');
      handler.next(err);
      return;
    }

    if (_isRefreshing) {
      handler.next(err);
      return;
    }

    _isRefreshing = true;

    try {
      final newTokens = await _refreshTokens(refreshToken);

      if (newTokens != null) {
        await _secureStorage.write(
          key: AppConstants.accessTokenKey,
          value: newTokens['access_token'],
        );
        await _secureStorage.write(
          key: AppConstants.refreshTokenKey,
          value: newTokens['refresh_token'],
        );

        final clonedRequest = await _retryRequest(
          err.requestOptions,
          newTokens['access_token']!,
        );
        handler.resolve(clonedRequest);
      } else {
        handler.next(err);
      }
    } catch (e) {
      await _secureStorage.delete(key: AppConstants.accessTokenKey);
      await _secureStorage.delete(key: AppConstants.refreshTokenKey);
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }

  Future<Map<String, String>?> _refreshTokens(String refreshToken) async {
    try {
      final response = await _dio.post(
        '${EnvConfig.instance.apiBaseUrl}/api/v1/auth/refresh',
        data: {'refresh_token': refreshToken},
        options: Options(
          headers: {'Content-Type': 'application/json'},
        ),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data is Map ? response.data as Map : {};
        if (data['success'] == true && data['data'] != null) {
          final dataMap = data['data'] as Map;
          return {
            'access_token': dataMap['access_token'] as String,
            'refresh_token': dataMap['refresh_token'] as String,
          };
        }
      }
    } catch (e) {
      AppLogger.instance.auth.warning('Token refresh failed: $e');
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

    return _dio.fetch(requestOptions);
  }

  bool _isAuthEndpoint(String path) {
    return path.contains('/auth/login') || path.contains('/auth/refresh');
  }
}

/// Custom pretty dio logger
class _PrettyDioLogger extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    AppLogger.instance.logNetworkRequest(
      options.method,
      options.uri.toString(),
      headers: options.headers,
    );
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    AppLogger.instance.logNetworkResponse(
      response.statusCode ?? 0,
      response.requestOptions.uri.toString(),
      data: response.data,
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
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