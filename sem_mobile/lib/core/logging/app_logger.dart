import 'package:talker/talker.dart';

/// Centralized application logging
class AppLogger {
  static AppLogger? _instance;
  final Talker _talker;

  AppLogger._() : _talker = Talker();

  static AppLogger get instance {
    _instance ??= AppLogger._();
    return _instance!;
  }

  Talker get talker => _talker;

  // Named loggers for different domains
  Talker get auth => _talker;
  Talker get network => _talker;
  Talker get storage => _talker;
  Talker get ui => _talker;
  Talker get security => _talker;
  Talker get lifecycle => _talker;

  // Global methods for convenience
  void debug(String message, [dynamic extra]) {
    _talker.debug(message, extra);
  }

  void info(String message, [dynamic extra]) {
    _talker.info(message, extra);
  }

  void warning(String message, [dynamic extra]) {
    _talker.warning(message, extra);
  }

  void error(String message, [dynamic error, StackTrace? stackTrace]) {
    _talker.error(message, error, stackTrace);
  }

  void fatal(String message, [dynamic error, StackTrace? stackTrace]) {
    _talker.critical(message, error, stackTrace);
  }

  //Formatted logging
  void logNetworkRequest(String method, String url, {Map<String, dynamic>? headers}) {
    info('🌐 $method $url', headers);
  }

  void logNetworkResponse(int statusCode, String url, {dynamic data}) {
    info('📥 Response [$statusCode] $url', data);
  }

  void logNetworkError(String message, String url) {
    error('❌ Network Error: $message', url);
  }

  void logAuth(String message, {String? userId}) {
    info('🔐 $message', userId != null ? {'userId': userId} : null);
  }

  void logSecurity(String message, {String? action}) {
    info('🛡️ $message', action != null ? {'action': action} : null);
  }

  void logLifecycle(String message) {
    info('📱 $message');
  }
}