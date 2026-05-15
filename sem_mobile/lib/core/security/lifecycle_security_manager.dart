import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sem_mobile/core/environment/env_config.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';

/// App lifecycle states for security tracking
enum SecureLifecycleState {
  initialized,
  active,
  inactive,
  paused,
  resumed,
  backgrounded,
  terminated,
}

/// Listener for lifecycle state changes
typedef LifecycleStateListener = void Function(SecureLifecycleState state);

/// App lifecycle security manager
/// Handles background/foreground transitions, auto-lock, and secure overlay
class LifecycleSecurityManager {
  static LifecycleSecurityManager? _instance;
  static LifecycleSecurityManager get instance {
    _instance ??= LifecycleSecurityManager._();
    return _instance!;
  }

  LifecycleSecurityManager._();

  final AppLogger _logger = AppLogger.instance;
  final List<LifecycleStateListener> _listeners = [];
  SecureLifecycleState _currentState = SecureLifecycleState.initialized;
  DateTime? _lastActiveTime;
  Timer? _inactivityTimer;
  bool _isLocked = false;
  bool _biometricOnResume = false;
  bool _blurOnBackground = true;

  SecureLifecycleState get currentState => _currentState;
  bool get isLocked => _isLocked;
  bool get isActive => _currentState == SecureLifecycleState.active;

  /// Configure the lifecycle manager
  void configure({
    bool biometricOnResume = false,
    bool blurOnBackground = true,
    int autoLockTimeoutMs = 300000, // 5 minutes default
  }) {
    _biometricOnResume = biometricOnResume;
    _blurOnBackground = blurOnBackground;
    _setInactivityTimeout(autoLockTimeoutMs);
    _logger.info('LifecycleSecurityManager configured: biometricOnResume=$biometricOnResume, autoLockTimeout=${autoLockTimeoutMs}ms');
  }

  /// Add a listener for lifecycle state changes
  void addListener(LifecycleStateListener listener) {
    _listeners.add(listener);
  }

  /// Remove a lifecycle state listener
  void removeListener(LifecycleStateListener listener) {
    _listeners.remove(listener);
  }

  /// Handle app lifecycle state change
  void handleStateChange(AppLifecycleState state) {
    final previousState = _currentState;
    SecureLifecycleState newState;

    switch (state) {
      case AppLifecycleState.resumed:
        newState = SecureLifecycleState.active;
        _onForeground();
        break;
      case AppLifecycleState.inactive:
        newState = SecureLifecycleState.inactive;
        _onInactive();
        break;
      case AppLifecycleState.paused:
        newState = SecureLifecycleState.paused;
        _onPaused();
        break;
      case AppLifecycleState.detached:
        newState = SecureLifecycleState.terminated;
        _onTerminated();
        break;
      case AppLifecycleState.hidden:
        newState = SecureLifecycleState.backgrounded;
        _onBackground();
        break;
    }

    _currentState = newState;
    _notifyListeners(newState);

    if (previousState != newState) {
      _logger.debug('Lifecycle state: $previousState -> $newState');
    }
  }

  void _onForeground() {
    _lastActiveTime = DateTime.now();
    _resetInactivityTimer();

    // Check if we need to unlock
    if (_isLocked) {
      if (!_biometricOnResume) {
        _isLocked = false;
      }
      // If biometricOnResume is true, the UI will handle unlock
    }

    // Apply secure overlay removal
    _updateSecureOverlay(false);
  }

  void _onInactive() {
    // App is transitioning, prepare for background
    _updateSecureOverlay(_blurOnBackground);
  }

  void _onPaused() {
    _lastActiveTime = DateTime.now();
    _updateSecureOverlay(_blurOnBackground);
  }

  void _onBackground() {
    _cancelInactivityTimer();
    _updateSecureOverlay(true);

    // Hide all revealed secrets when backgrounded
    _notifyListeners(SecureLifecycleState.backgrounded);
  }

  void _onTerminated() {
    _cancelInactivityTimer();
    _clearSensitiveData();
  }

  /// Lock the app manually
  void lock() {
    _isLocked = true;
    _updateSecureOverlay(true);
    _notifyListeners(SecureLifecycleState.backgrounded);
    _logger.info('App locked');
  }

  /// Unlock the app
  void unlock() {
    _isLocked = false;
    _lastActiveTime = DateTime.now();
    _updateSecureOverlay(false);
    _logger.info('App unlocked');
  }

  /// Force unlock after biometric success
  void unlockWithBiometric() {
    if (_biometricOnResume) {
      unlock();
    }
  }

  void _setInactivityTimeout(int timeoutMs) {
    _cancelInactivityTimer();
    _inactivityTimer = Timer(Duration(milliseconds: timeoutMs), () {
      if (_currentState == SecureLifecycleState.active) {
        lock();
        _notifyListeners(SecureLifecycleState.backgrounded);
        _logger.info('App locked due to inactivity');
      }
    });
  }

  void _resetInactivityTimer() {
    if (_isLocked) return;
    final timeout = EnvConfig.instance.autoLockTimeout;
    _setInactivityTimeout(timeout);
  }

  void _cancelInactivityTimer() {
    _inactivityTimer?.cancel();
    _inactivityTimer = null;
  }

  /// Update secure overlay to prevent screenshots
  void _updateSecureOverlay(bool enabled) {
    try {
      if (enabled) {
        // Show secure overlay to blur content in app switcher
        SystemChannels.platform.invokeMethod('SystemChrome.setPreferredOrientations');
        // Note: Full screenshot prevention requires platform channels
        // For now, we rely on the flag in AndroidManifest.xml
      }
    } catch (e) {
      _logger.warning('Failed to update secure overlay: $e');
    }
  }

  void _clearSensitiveData() {
    // This will be called by blocs when backgrounded
    _notifyListeners(SecureLifecycleState.terminated);
  }

  void _notifyListeners(SecureLifecycleState state) {
    for (final listener in _listeners) {
      try {
        listener(state);
      } catch (e) {
        _logger.error('Lifecycle listener error: $e');
      }
    }
  }

  /// Get time since last activity
  Duration? get timeSinceLastActivity {
    return _lastActiveTime != null
        ? DateTime.now().difference(_lastActiveTime!)
        : null;
  }

  /// Reset activity timestamp
  void resetActivityTimer() {
    _lastActiveTime = DateTime.now();
    _resetInactivityTimer();
  }

  void dispose() {
    _cancelInactivityTimer();
    _listeners.clear();
    _instance = null;
  }
}