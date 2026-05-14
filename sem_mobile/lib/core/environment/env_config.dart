import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Typed environment configuration service
/// All environment variables are accessed through this service to ensure
/// type safety and validation at runtime.
class EnvConfig {
  static EnvConfig? _instance;
  static bool _loaded = false;

  // Cached values
  late final String apiBaseUrl;
  late final String wsBaseUrl;
  late final int apiTimeout;
  late final String appEnv;
  late final String appName;
  late final bool enableLogging;
  late final bool enableSentry;
  late final String? sentryDsn;
  late final int autoLockTimeout;
  late final int clipboardClearTimeout;

  EnvConfig._();

  static Future<EnvConfig> getInstance() async {
    if (_instance == null) {
      _instance = EnvConfig._();
      await _instance!._load();
    }
    return _instance!;
  }

  static EnvConfig get instance {
    if (_instance == null) {
      throw StateError('EnvConfig not initialized. Call getInstance() first.');
    }
    return _instance!;
  }

  Future<void> _load() async {
    if (_loaded) return;

    // Determine which env file to load based on build mode
    final envToLoad = kDebugMode ? '.env.development' : '.env.$appEnv';

    try {
      await dotenv.load(fileName: envToLoad);
      _loaded = true;
    } catch (e) {
      debugPrint('Warning: Could not load env file: $e');
      _loaded = true;
    }

    _bindValues();
  }

  void _bindValues() {
    apiBaseUrl = _getString('API_BASE_URL', 'http://localhost:8070');
    wsBaseUrl = _getString('WS_BASE_URL', 'ws://localhost:8070/ws');
    apiTimeout = _getInt('API_TIMEOUT', 30000);
    appEnv = _getString('APP_ENV', 'development');
    appName = _getString('APP_NAME', 'Secure Environment Manager');
    enableLogging = _getBool('ENABLE_LOGGING', true);
    enableSentry = _getBool('ENABLE_SENTRY', false);
    sentryDsn = dotenv.env['SENTRY_DSN'];
    autoLockTimeout = _getInt('AUTO_LOCK_TIMEOUT', 300000);
    clipboardClearTimeout = _getInt('CLIPBOARD_CLEAR_TIMEOUT', 30000);
  }

  String _getString(String key, String defaultValue) {
    final value = dotenv.env[key];
    return value?.isNotEmpty == true ? value! : defaultValue;
  }

  int _getInt(String key, int defaultValue) {
    final value = dotenv.env[key];
    if (value == null || value.isEmpty) return defaultValue;
    return int.tryParse(value) ?? defaultValue;
  }

  bool _getBool(String key, bool defaultValue) {
    final value = dotenv.env[key];
    if (value == null || value.isEmpty) return defaultValue;
    return value.toLowerCase() == 'true' || value == '1';
  }

  bool get isProduction => appEnv == 'production';
  bool get isDevelopment => appEnv == 'development';
  bool get isStaging => appEnv == 'staging';

  String apiUrl(String path) {
    final base = apiBaseUrl.endsWith('/') ? apiBaseUrl : '$apiBaseUrl/';
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return '$base$cleanPath';
  }

  String wsUrl(String path) {
    final base = wsBaseUrl.endsWith('/') ? wsBaseUrl : '$wsBaseUrl/';
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return '$base$cleanPath';
  }

  List<String> validate() {
    final errors = <String>[];
    if (apiBaseUrl.isEmpty) errors.add('API_BASE_URL is required');
    if (appEnv.isEmpty) errors.add('APP_ENV is required');
    if (enableSentry && sentryDsn == null) {
      errors.add('SENTRY_DSN is required when ENABLE_SENTRY=true');
    }
    return errors;
  }
}

/// Environment type enum
enum AppEnvironment { local, staging, production }

/// Environment configuration
class Environment {
  final String name;
  final String apiBaseUrl;
  final String wsUrl;
  final bool enableLogging;
  final bool enableSentry;
  final bool enableAnalytics;

  const Environment({
    required this.name,
    required this.apiBaseUrl,
    required this.wsUrl,
    this.enableLogging = true,
    this.enableSentry = false,
    this.enableAnalytics = false,
  });
}

/// Pre-configured environments
abstract final class Environments {
  static Environment fromString(String? value) {
    switch (value) {
      case 'staging':
        return staging;
      case 'production':
        return production;
      default:
        return local;
    }
  }

  static const Environment local = Environment(
    name: 'local',
    apiBaseUrl: 'http://localhost:8070',
    wsUrl: 'ws://localhost:8070/ws',
    enableLogging: true,
    enableSentry: false,
    enableAnalytics: false,
  );

  static const Environment staging = Environment(
    name: 'staging',
    apiBaseUrl: 'https://staging-api.sem.internal',
    wsUrl: 'wss://staging-api.sem.internal/ws',
    enableLogging: true,
    enableSentry: true,
    enableAnalytics: true,
  );

  static const Environment production = Environment(
    name: 'production',
    apiBaseUrl: 'https://api.sem.internal',
    wsUrl: 'wss://api.sem.internal/ws',
    enableLogging: false,
    enableSentry: true,
    enableAnalytics: true,
  );
}