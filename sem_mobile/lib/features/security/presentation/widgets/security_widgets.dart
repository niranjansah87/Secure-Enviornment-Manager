import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:sem_mobile/core/theme/app_theme.dart';
import 'package:sem_mobile/features/security/domain/entities/security_alert.dart';

/// Security banner widget for displaying suspicious activity warnings
class SecurityBanner extends StatelessWidget {
  final SecurityAlert alert;
  final VoidCallback? onDismiss;
  final VoidCallback? onViewDetails;

  const SecurityBanner({
    super.key,
    required this.alert,
    this.onDismiss,
    this.onViewDetails,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.warningColor.withValues(alpha: 0.15),
            AppTheme.warningColor.withValues(alpha: 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.warningColor.withValues(alpha: 0.3)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onViewDetails,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.warningColor.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    _getAlertIcon(),
                    color: AppTheme.warningColor,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        alert.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        alert.message,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        alert.relativeTime,
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.white.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                if (onDismiss != null)
                  IconButton(
                    icon: Icon(
                      Icons.close,
                      color: Colors.white.withValues(alpha: 0.6),
                      size: 20,
                    ),
                    onPressed: onDismiss,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getAlertIcon() {
    return switch (alert.type) {
      SecurityAlertType.suspiciousActivity => Icons.warning_amber,
      SecurityAlertType.sessionRevoked => Icons.logout,
      SecurityAlertType.forcedLogout => Icons.exit_to_app,
      SecurityAlertType.deviceCompromised => Icons.phonelink_off,
      SecurityAlertType.apiKeyExposed => Icons.key,
      SecurityAlertType.unusualLocation => Icons.location_off,
      SecurityAlertType.multipleFailedAttempts => Icons.lock,
      SecurityAlertType.permissionChanged => Icons.security,
    };
  }
}

/// Inactivity warning countdown widget
class InactivityWarningDialog extends StatefulWidget {
  final int remainingSeconds;
  final VoidCallback onStayLoggedIn;
  final VoidCallback onLogout;

  const InactivityWarningDialog({
    super.key,
    required this.remainingSeconds,
    required this.onStayLoggedIn,
    required this.onLogout,
  });

  @override
  State<InactivityWarningDialog> createState() => _InactivityWarningDialogState();
}

class _InactivityWarningDialogState extends State<InactivityWarningDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _scaleAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnimation,
      child: AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.warningColor.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.timer, color: AppTheme.warningColor),
            ),
            const SizedBox(width: 12),
            const Text('Session Timeout'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Your session will expire due to inactivity.',
              style: TextStyle(color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 24),
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 1.0, end: 0.0),
              duration: Duration(seconds: widget.remainingSeconds),
              builder: (context, value, child) {
                return Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 80,
                      height: 80,
                      child: CircularProgressIndicator(
                        value: value,
                        strokeWidth: 6,
                        backgroundColor: AppTheme.dividerColor,
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.warningColor),
                      ),
                    ),
                    Text(
                      '${(value * widget.remainingSeconds).ceil()}',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: widget.onLogout,
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('LOGOUT'),
          ),
          ElevatedButton(
            onPressed: widget.onStayLoggedIn,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('STAY LOGGED IN'),
          ),
        ],
      ),
    );
  }
}

/// Forced logout dialog when session is revoked
class ForcedLogoutDialog extends StatelessWidget {
  final String? reason;

  const ForcedLogoutDialog({
    super.key,
    this.reason,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppTheme.surfaceColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.errorColor.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.logout, color: AppTheme.errorColor),
          ),
          const SizedBox(width: 12),
          const Text('Session Ended'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            reason ?? 'Your session has been revoked.',
            style: TextStyle(color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 16),
          Text(
            'Please log in again to continue.',
            style: TextStyle(color: AppTheme.textSecondary),
          ),
        ],
      ),
      actions: [
        ElevatedButton(
          onPressed: () => Navigator.of(context).pop(),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
          ),
          child: const Text('LOG IN'),
        ),
      ],
    );
  }
}

/// Biometric auth required dialog
class BiometricRequiredDialog extends StatelessWidget {
  final String action;
  final VoidCallback onAuthenticate;
  final VoidCallback onCancel;

  const BiometricRequiredDialog({
    super.key,
    required this.action,
    required this.onAuthenticate,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppTheme.surfaceColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.fingerprint, color: AppTheme.primaryColor),
          ),
          const SizedBox(width: 12),
          const Text('Authentication Required'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.lock_outline,
            size: 48,
            color: Colors.white54,
          ),
          const SizedBox(height: 16),
          Text(
            'Verify your identity to $action.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textSecondary),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: onCancel,
          child: const Text('CANCEL'),
        ),
        ElevatedButton.icon(
          onPressed: onAuthenticate,
          icon: const Icon(Icons.fingerprint),
          label: const Text('VERIFY'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
          ),
        ),
      ],
    );
  }
}

/// Secure copy success indicator
class SecureCopyIndicator extends StatefulWidget {
  final String label;

  const SecureCopyIndicator({super.key, required this.label});

  @override
  State<SecureCopyIndicator> createState() => _SecureCopyIndicatorState();
}

class _SecureCopyIndicatorState extends State<SecureCopyIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 0.5, end: 1.2).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
      ),
    );
    _fadeAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.5, 1.0, curve: Curves.easeIn),
      ),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Opacity(
          opacity: _fadeAnimation.value,
          child: Transform.scale(
            scale: _scaleAnimation.value,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.successColor,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check, size: 14, color: Colors.white),
                  const SizedBox(width: 4),
                  Text(
                    '${widget.label} copied',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Session revoked notification
class SessionRevokedNotification extends StatelessWidget {
  final String deviceName;
  final VoidCallback onDismiss;

  const SessionRevokedNotification({
    super.key,
    required this.deviceName,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.errorColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.errorColor.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.device_unknown, color: AppTheme.errorColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Session Revoked',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Session on $deviceName has been revoked.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: onDismiss,
            color: AppTheme.textSecondary,
          ),
        ],
      ),
    );
  }
}