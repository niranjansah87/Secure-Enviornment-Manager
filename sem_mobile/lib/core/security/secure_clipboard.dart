import 'dart:async';
import 'package:flutter/services.dart';
import 'package:sem_mobile/core/environment/env_config.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';

/// Secure clipboard manager with auto-clear functionality
class SecureClipboardManager {
  static SecureClipboardManager? _instance;
  static SecureClipboardManager get instance {
    _instance ??= SecureClipboardManager._();
    return _instance!;
  }

  SecureClipboardManager._();

  final AppLogger _logger = AppLogger.instance;
  Timer? _clearTimer;
  String? _lastCopiedValue;
  DateTime? _lastCopyTime;

  /// Copy text to clipboard with auto-clear
  Future<void> copy(String text, {bool autoClear = true}) async {
    try {
      // Cancel any pending clear
      _clearTimer?.cancel();

      // Store for logging (without exposing value)
      _lastCopiedValue = text;
      _lastCopyTime = DateTime.now();

      // Copy to clipboard
      await Clipboard.setData(ClipboardData(text: text));
      _logger.debug('Copied to clipboard (auto-clear: $autoClear)');

      if (autoClear) {
        _scheduleClear();
      }
    } catch (e) {
      _logger.error('Failed to copy to clipboard: $e');
      rethrow;
    }
  }

  /// Schedule clipboard clear
  void _scheduleClear() {
    final timeout = EnvConfig.instance.clipboardClearTimeout;
    _clearTimer?.cancel();
    _clearTimer = Timer(Duration(milliseconds: timeout), () {
      clear();
    });
  }

  /// Clear the clipboard immediately
  Future<void> clear() async {
    try {
      await Clipboard.setData(const ClipboardData(text: ''));
      _lastCopiedValue = null;
      _clearTimer?.cancel();
      _clearTimer = null;
      _logger.debug('Clipboard cleared');
    } catch (e) {
      _logger.error('Failed to clear clipboard: $e');
    }
  }

  /// Manually clear clipboard
  Future<void> clearNow() async {
    _clearTimer?.cancel();
    await clear();
  }

  /// Check if clipboard has content we copied
  bool hasOurContent() {
    return _lastCopiedValue != null;
  }

  /// Get time since last copy
  Duration? get timeSinceLastCopy {
    return _lastCopyTime != null
        ? DateTime.now().difference(_lastCopyTime!)
        : null;
  }

  void dispose() {
    _clearTimer?.cancel();
    _instance = null;
  }
}

/// Sensitive text filter for logging
class SecureLogFilter {
  static final SecureLogFilter _instance = SecureLogFilter._();
  static SecureLogFilter get instance => _instance;

  SecureLogFilter._();

  final AppLogger _logger = AppLogger.instance;

  // Patterns that indicate sensitive data
  static const _sensitivePatterns = [
    'password',
    'secret',
    'token',
    'apikey',
    'api_key',
    'access_token',
    'refresh_token',
    'auth',
    'credential',
    'private_key',
    'secret_key',
  ];

  // Keys that should be redacted
  static const _sensitiveKeys = [
    'value',
    'password',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
    'authorization',
    'credentials',
  ];

  /// Check if a string contains sensitive data patterns
  bool containsSensitiveData(String text) {
    final lowerText = text.toLowerCase();
    return _sensitivePatterns.any((pattern) => lowerText.contains(pattern));
  }

  /// Redact sensitive values from a string
  String redactSensitiveData(String text) {
    if (!containsSensitiveData(text)) {
      return text;
    }

    String redacted = text;

    // Redact sensitive key-value pairs
    for (final key in _sensitiveKeys) {
      // Match "key": "value" or "key": "****" patterns
      final keyValuePattern = RegExp('"$key"\\s*:\\s*"[^"]*"', caseSensitive: false);
      redacted = redacted.replaceAll(keyValuePattern, '"$key": "***REDACTED***"');
    }

    return redacted;
  }

  /// Safe log a message that might contain sensitive data
  void safeLog(String message, {String? tag}) {
    if (containsSensitiveData(message)) {
      _logger.debug('[SAFE] ${tag ?? 'LOG'}: ${redactSensitiveData(message)}');
    } else {
      _logger.debug('[SAFE] ${tag ?? 'LOG'}: $message');
    }
  }

  /// Log a value with secure handling
  void logSecure(String label, String? value, {String? tag}) {
    if (value == null) {
      _logger.debug('[SECURE] ${tag ?? label}: null');
      return;
    }

    if (containsSensitiveData(label) || containsSensitiveData(value)) {
      _logger.debug('[SECURE] $label: ***REDACTED***');
    } else {
      _logger.debug('[SECURE] $label: $value');
    }
  }

  /// Sanitize a map for logging
  Map<String, dynamic> sanitizeForLogging(Map<String, dynamic> data) {
    final sanitized = <String, dynamic>{};

    for (final entry in data.entries) {
      final key = entry.key;
      final value = entry.value;

      if (_sensitiveKeys.contains(key)) {
        sanitized[key] = '***REDACTED***';
      } else if (value is Map<String, dynamic>) {
        sanitized[key] = sanitizeForLogging(value);
      } else if (value is String && containsSensitiveData(value)) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /// Sanitize a list for logging
  List<dynamic> sanitizeListForLogging(List<dynamic> data) {
    return data.map((item) {
      if (item is Map<String, dynamic>) {
        return sanitizeForLogging(item);
      }
      return item;
    }).toList();
  }
}