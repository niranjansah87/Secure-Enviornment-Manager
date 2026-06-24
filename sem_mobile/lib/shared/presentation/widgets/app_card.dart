import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimensions.dart';
import '../../../core/theme/app_typography.dart';

/// Card wrapper with consistent styling
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final VoidCallback? onTap;
  final bool isHighlighted;
  final AppCardVariant variant;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.isHighlighted = false,
    this.variant = AppCardVariant.defaultCard,
  });

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: padding ?? const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(
          color: isHighlighted ? AppColors.accent : AppColors.border,
          width: isHighlighted ? 1.5 : 1,
        ),
      ),
      child: child,
    );

    return Container(
      margin: margin,
      child: onTap != null
          ? InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(AppRadius.card),
              child: content,
            )
          : content,
    );
  }

  Color get _backgroundColor => switch (variant) {
        AppCardVariant.defaultCard => AppColors.surface,
        AppCardVariant.elevated => AppColors.surfaceElevated,
        AppCardVariant.outlined => Colors.transparent,
      };
}

/// Highlight card variant for selected/focused states
class AppHighlightCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final VoidCallback? onTap;
  final Color? highlightColor;

  const AppHighlightCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.highlightColor,
  });

  @override
  Widget build(BuildContext context) {
    final color = highlightColor ?? AppColors.accent;
    final content = Container(
      padding: padding ?? const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: color, width: 1.5),
      ),
      child: child,
    );

    return Container(
      margin: margin,
      child: onTap != null
          ? InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(AppRadius.card),
              child: content,
            )
          : content,
    );
  }
}

enum AppCardVariant { defaultCard, elevated, outlined }