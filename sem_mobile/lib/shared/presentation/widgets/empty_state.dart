import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimensions.dart';
import '../../../core/theme/app_typography.dart';
import 'app_button.dart';

/// Empty state widget with illustration
class EmptyState extends StatelessWidget {
  final String title;
  final String? description;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Color? iconColor;
  final bool showAnimation;

  const EmptyState({
    super.key,
    required this.title,
    this.description,
    this.icon = Icons.inbox_outlined,
    this.actionLabel,
    this.onAction,
    this.iconColor,
    this.showAnimation = true,
  });

  @override
  Widget build(BuildContext context) {
    final iconWidget = Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: (iconColor ?? AppColors.textTertiary).withValues(alpha: 0.1),
        shape: BoxShape.circle,
        border: Border.all(
          color: (iconColor ?? AppColors.textTertiary).withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Icon(
        icon,
        size: AppSpacing.iconSizeLg,
        color: iconColor ?? AppColors.textTertiary,
      ),
    );

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            showAnimation ? iconWidget : iconWidget,
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              style: AppTypography.titleMedium.copyWith(
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
            if (description != null) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                description!,
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: actionLabel!,
                onPressed: () {
                  HapticFeedback.lightImpact();
                  onAction?.call();
                },
                variant: AppButtonVariant.outlined,
                leadingIcon: Icons.add,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// State-specific empty views for common scenarios
class NoSecretsEmptyState extends StatelessWidget {
  final VoidCallback? onCreateSecret;

  const NoSecretsEmptyState({super.key, this.onCreateSecret});

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.key_outlined,
      title: 'No secrets yet',
      description: 'Add your first secret to get started',
      iconColor: AppColors.secret,
      actionLabel: 'Add Secret',
      onAction: onCreateSecret,
    );
  }
}

class NoEnvironmentsEmptyState extends StatelessWidget {
  const NoEnvironmentsEmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.cloud_outlined,
      title: 'No environments yet',
      description: 'Environments will appear here',
      iconColor: AppColors.environment,
    );
  }
}

class NoSearchResultsEmptyState extends StatelessWidget {
  final String query;

  const NoSearchResultsEmptyState({super.key, required this.query});

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.search_off,
      title: 'No results found',
      description: 'No matches for "$query"',
      iconColor: AppColors.textTertiary,
    );
  }
}