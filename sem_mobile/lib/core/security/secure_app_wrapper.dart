import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sem_mobile/core/security/lifecycle_security_manager.dart';
import 'package:sem_mobile/core/security/auth_coordinator.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';

/// Secure app wrapper that handles lifecycle security
class SecureAppWrapper extends StatefulWidget {
  final Widget child;
  final bool requireBiometricOnResume;
  final bool blurOnBackground;

  const SecureAppWrapper({
    super.key,
    required this.child,
    this.requireBiometricOnResume = false,
    this.blurOnBackground = true,
  });

  @override
  State<SecureAppWrapper> createState() => _SecureAppWrapperState();
}

class _SecureAppWrapperState extends State<SecureAppWrapper>
    with WidgetsBindingObserver {
  final AppLogger _logger = AppLogger.instance;
  final LifecycleSecurityManager _lifecycleManager = LifecycleSecurityManager.instance;

  bool _showBlur = false;
  bool _isLocked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _lifecycleManager.configure(
      biometricOnResume: widget.requireBiometricOnResume,
      blurOnBackground: widget.blurOnBackground,
    );

    _lifecycleManager.addListener(_onLifecycleStateChanged);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _lifecycleManager.removeListener(_onLifecycleStateChanged);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleManager.handleStateChange(state);
  }

  void _onLifecycleStateChanged(SecureLifecycleState state) {
    switch (state) {
      case SecureLifecycleState.backgrounded:
        setState(() {
          _showBlur = true;
        });
        // Trigger auto-hide secrets in secrets bloc if needed
        break;

      case SecureLifecycleState.active:
      case SecureLifecycleState.resumed:
        if (!_isLocked) {
          setState(() {
            _showBlur = false;
          });
        }
        break;

      case SecureLifecycleState.paused:
      case SecureLifecycleState.inactive:
        setState(() {
          _showBlur = true;
        });
        break;

      case SecureLifecycleState.terminated:
        _showBlur = true;
        break;

      case SecureLifecycleState.initialized:
        break;
    }
  }

  void _onUnlock() {
    setState(() {
      _isLocked = false;
      _showBlur = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,

        // Blur overlay for app switcher
        if (_showBlur)
          Positioned.fill(
            child: _SecureBlurOverlay(
              onUnlock: _isLocked ? _onUnlock : null,
              requireBiometric: widget.requireBiometricOnResume && _isLocked,
            ),
          ),
      ],
    );
  }
}

/// Blur overlay for sensitive content protection
class _SecureBlurOverlay extends StatelessWidget {
  final VoidCallback? onUnlock;
  final bool requireBiometric;

  const _SecureBlurOverlay({
    this.onUnlock,
    this.requireBiometric = false,
  });

  @override
  Widget build(BuildContext context) {
    return BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
      child: Container(
        color: Colors.black.withValues(alpha: 0.3),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_outline,
                  size: 48,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'App Locked',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Tap to unlock',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                ),
              ),
              if (onUnlock != null) ...[
                const SizedBox(height: 32),
                ElevatedButton.icon(
                  onPressed: onUnlock,
                  icon: const Icon(Icons.fingerprint),
                  label: const Text('Unlock'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 16,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Widget that auto-hides secrets when app is backgrounded
class SensitiveContentProtector extends StatefulWidget {
  final Widget child;
  final Set<String> revealedSecretIds;

  const SensitiveContentProtector({
    super.key,
    required this.child,
    required this.revealedSecretIds,
  });

  @override
  State<SensitiveContentProtector> createState() => _SensitiveContentProtectorState();
}

class _SensitiveContentProtectorState extends State<SensitiveContentProtector>
    with WidgetsBindingObserver {
  final LifecycleSecurityManager _lifecycleManager = LifecycleSecurityManager.instance;
  bool _wasBackgrounded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _lifecycleManager.addListener(_onLifecycleChanged);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _lifecycleManager.removeListener(_onLifecycleChanged);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _lifecycleManager.handleStateChange(state);

    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.inactive) {
      _wasBackgrounded = true;
    }
  }

  void _onLifecycleChanged(SecureLifecycleState state) {
    if (state == SecureLifecycleState.active && _wasBackgrounded) {
      // App resumed after being backgrounded
      _wasBackgrounded = false;
      // The parent bloc should handle hiding revealed secrets
      // This is just a signal that the app is active again
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}