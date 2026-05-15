import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';

/// Mobile security configuration
class MobileSecurityConfig {
  final bool enableScreenshotPrevention;
  final bool enableDebugDetection;
  final bool enableRootDetection;
  final bool enableBackupProtection;
  final bool enableClipboardProtection;
  final int clipboardClearTimeoutMs;

  const MobileSecurityConfig({
    this.enableScreenshotPrevention = true,
    this.enableDebugDetection = true,
    this.enableRootDetection = true,
    this.enableBackupProtection = true,
    this.enableClipboardProtection = true,
    this.clipboardClearTimeoutMs = 30000,
  });

  static const MobileSecurityConfig production = MobileSecurityConfig(
    enableScreenshotPrevention: true,
    enableDebugDetection: true,
    enableRootDetection: true,
    enableBackupProtection: true,
    enableClipboardProtection: true,
    clipboardClearTimeoutMs: 30000,
  );
}

/// Mobile security checker for detecting insecure environments
class MobileSecurityChecker {
  static final MobileSecurityChecker _instance = MobileSecurityChecker._();
  static MobileSecurityChecker get instance => _instance;

  MobileSecurityChecker._();

  final AppLogger _logger = AppLogger.instance;
  bool _isInitialized = false;
  bool _isDeviceSecure = true;
  bool _isRooted = false;
  bool _isDebuggable = false;

  bool get isDeviceSecure => _isDeviceSecure;
  bool get isRooted => _isRooted;
  bool get isDebuggable => _isDebuggable;

  /// Perform initial security check
  Future<void> initialize() async {
    if (_isInitialized) return;

    _logger.info('Performing mobile security check...');

    _isRooted = await _checkRoot();
    _isDebuggable = await _checkDebuggable();

    _isDeviceSecure = !_isRooted && !_isDebuggable;

    if (_isRooted) {
      _logger.warning('Device appears to be rooted - security features limited');
    }

    if (_isDebuggable) {
      _logger.warning('App is running in debug mode - extra logging enabled');
    }

    _isInitialized = true;
    _logger.info('Mobile security check complete. Device secure: $_isDeviceSecure');
  }

  /// Check if device is rooted (Android) or jailbroken (iOS)
  Future<bool> _checkRoot() async {
    if (Platform.isAndroid) {
      return _checkAndroidRoot();
    } else if (Platform.isIOS) {
      return _checkIOSJailbreak();
    }
    return false;
  }

  Future<bool> _checkAndroidRoot() async {
    // Check for su binary
    final suPaths = [
      '/system/app/Superuser.apk',
      '/system/xbin/su',
      '/system/bin/su',
      '/sbin/su',
      '/vendor/bin/su',
    ];

    for (final path in suPaths) {
      if (await File(path).exists()) {
        _logger.warning('Root binary found at: $path');
        return true;
      }
    }

    // Check for root management apps
    final rootApps = ['com.noshufou.android.su', 'com.noshufou.android.su.elite', 'eu.chainfire.supersu'];
    // In a real app, would check PackageManager for these

    // Check for test-keys build tag
    final buildTags = Platform.operatingSystemVersion;
    if (buildTags.toLowerCase().contains('test-keys')) {
      _logger.warning('Build has test-keys tag');
      return true;
    }

    return false;
  }

  Future<bool> _checkIOSJailbreak() async {
    // iOS jailbreak detection
    // Note: This is simplified - real iOS jailbreak detection is more complex

    // Check for common jailbreak files
    final jailbreakPaths = [
      '/Applications/Cydia.app',
      '/Library/MobileSubstrate/MobileSubstrate.dylib',
      '/bin/bash',
      '/usr/sbin/sshd',
      '/etc/apt',
      '/private/var/lib/apt/',
    ];

    for (final path in jailbreakPaths) {
      if (await File(path).exists()) {
        _logger.warning('Jailbreak file found at: $path');
        return true;
      }
    }

    // Try to write to restricted directory
    try {
      final testFile = File('/private/jailbreak_test.txt');
      await testFile.writeAsString('test');
      await testFile.delete();
      // If we can write, device is insecure
      return true;
    } catch (_) {
      // Expected to fail on non-jailbroken device
    }

    return false;
  }

  /// Check if app is running in debug mode
  Future<bool> _checkDebuggable() async {
    // In debug mode, Platform.environment contains DEBUG flag
    // In release builds, this would be false
    return Platform.environment.containsKey('FLUTTER_DEBUG');
  }

  /// Get security assessment
  SecurityAssessment getSecurityAssessment() {
    return SecurityAssessment(
      isDeviceSecure: _isDeviceSecure,
      isRooted: _isRooted,
      isDebuggable: _isDebuggable,
      warnings: _generateWarnings(),
      recommendations: _generateRecommendations(),
    );
  }

  List<String> _generateWarnings() {
    final warnings = <String>[];

    if (_isRooted) {
      warnings.add('Device is rooted - secrets may be at risk');
    }

    if (_isDebuggable) {
      warnings.add('Debug mode enabled - enhanced logging active');
    }

    return warnings;
  }

  List<String> _generateRecommendations() {
    final recommendations = <String>[];

    if (!_isDeviceSecure) {
      recommendations.add('Use a non-rooted device for production');
      recommendations.add('Consider using hardware-backed keystore');
    }

    recommendations.add('Enable biometric authentication');
    recommendations.add('Keep app updated to latest version');
    recommendations.add('Avoid storing secrets in insecure locations');

    return recommendations;
  }

  /// Get device security info (safe for logging)
  Map<String, dynamic> getSecurityInfo() {
    return {
      'device_secure': _isDeviceSecure,
      'rooted': _isRooted,
      'debuggable': _isDebuggable,
      'platform': Platform.operatingSystem,
      'os_version': Platform.operatingSystemVersion,
      'sdk_version': Platform.version,
    };
  }
}

/// Security assessment result
class SecurityAssessment {
  final bool isDeviceSecure;
  final bool isRooted;
  final bool isDebuggable;
  final List<String> warnings;
  final List<String> recommendations;

  const SecurityAssessment({
    required this.isDeviceSecure,
    required this.isRooted,
    required this.isDebuggable,
    required this.warnings,
    required this.recommendations,
  });

  bool get hasWarnings => warnings.isNotEmpty;
  bool get isAcceptable => isDeviceSecure || isDebuggable;
}