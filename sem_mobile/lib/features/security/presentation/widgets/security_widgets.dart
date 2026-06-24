import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:sem_mobile/core/theme/app_colors.dart';
import 'package:sem_mobile/core/theme/app_dimensions.dart';
import 'package:sem_mobile/core/theme/app_typography.dart';
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
      margin: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.warning.withValues(alpha: 0.15),
            AppColors.warning.withValues(alpha: 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onViewDetails,
          borderRadius: BorderRadius.circular(AppRadius.card),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(
                    _getAlertIcon(),
                    color: AppColors.warning,
                    size: AppSpacing.iconSizeLg,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        alert.title,
                        style: AppTypography.titleSmall.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxs),
                      Text(
                        alert.message,
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: AppSpacing.xxs),
                      Text(
                        alert.relativeTime,
                        style: AppTypography.labelSmall.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (onDismiss != null)
                  IconButton(
                    icon: Icon(
                      Icons.close,
                      color: AppColors.textTertiary,
                      size: AppSpacing.iconSizeSm,
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
      duration: const Duration(milliseconds: AppDurations.fast),
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
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.modal),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Icon(Icons.timer, color: AppColors.warning),
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(
              'Session Timeout',
              style: AppTypography.titleMedium.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Your session will expire due to inactivity.',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
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
                        backgroundColor: AppColors.border,
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.warning),
                      ),
                    ),
                    Text(
                      '${(value * widget.remainingSeconds).ceil()}',
                      style: AppTypography.headlineMedium.copyWith(
                        color: AppColors.textPrimary,
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
              foregroundColor: AppColors.error,
            ),
            child: Text(
              'LOGOUT',
              style: AppTypography.labelLarge.copyWith(color: AppColors.error),
            ),
          ),
          AppButton(
            onPressed: widget.onStayLoggedIn,
            label: 'STAY LOGGED IN',
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
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.modal),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(Icons.logout, color: AppColors.error),
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            'Session Ended',
            style: AppTypography.titleMedium.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            reason ?? 'Your session has been revoked.',
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Please log in again to continue.',
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
      actions: [
        AppButton(
          onPressed: () => Navigator.of(context).pop(),
          label: 'LOG IN',
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
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.modal),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.accent.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(Icons.fingerprint, color: AppColors.accent),
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            'Authentication Required',
            style: AppTypography.titleMedium.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.lock_outline,
            size: AppSpacing.iconSizeXl,
            color: AppColors.textTertiary,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Verify your identity to $action.',
            textAlign: TextAlign.center,
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: onCancel,
          child: Text(
            'CANCEL',
            style: AppTypography.labelLarge.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
        AppButton(
          onPressed: onAuthenticate,
          label: 'VERIFY',
          leadingIcon: Icons.fingerprint,
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
      duration: const Duration(milliseconds: AppDurations.shimmerCycle),
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
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xxs,
              ),
              decoration: BoxDecoration(
                color: AppColors.success,
                borderRadius: BorderRadius.circular(AppRadius.lg),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.check,
                    size: AppSpacing.iconSizeSm,
                    color: Colors.white,
                  ),
                  const SizedBox(width: AppSpacing.xxs),
                  Text(
                    '${widget.label} copied',
                    style: AppTypography.labelMedium.copyWith(
                      color: Colors.white,
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
      margin: const EdgeInsets.all(AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(Icons.device_unknown, color: AppColors.error),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Session Revoked',
                  style: AppTypography.titleSmall.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: AppSpacing.xxs),
                Text(
                  'Session on $deviceName has been revoked.',
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(
              Icons.close,
              size: AppSpacing.iconSizeSm,
              color: AppColors.textSecondary,
            ),
            onPressed: onDismiss,
          ),
        ],
      ),
    );
  }
}