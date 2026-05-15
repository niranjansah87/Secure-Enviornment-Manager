import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:sem_mobile/core/theme/app_colors.dart';
import 'package:sem_mobile/core/theme/app_dimensions.dart';
import 'package:sem_mobile/core/theme/app_typography.dart';

/// Loading skeleton widget with shimmer effect
class LoadingSkeleton extends StatelessWidget {
  final double height;
  final double width;
  final double borderRadius;
  final bool showShimmer;

  const LoadingSkeleton({
    super.key,
    this.height = 20,
    this.width = double.infinity,
    this.borderRadius = AppRadius.xs,
    this.showShimmer = true,
  });

  @override
  Widget build(BuildContext context) {
    if (!showShimmer) {
      return Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      );
    }

    return Shimmer.fromColors(
      baseColor: AppColors.surface,
      highlightColor: AppColors.surfaceLight,
      period: const Duration(milliseconds: AppDurations.shimmerCycle),
      child: Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

/// Skeleton list for loading states
class SkeletonList extends StatelessWidget {
  final int itemCount;
  final double itemHeight;
  final double borderRadius;
  final double separatorHeight;

  const SkeletonList({
    super.key,
    this.itemCount = 6,
    this.itemHeight = 72,
    this.borderRadius = AppRadius.md,
    this.separatorHeight = AppSpacing.sm,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      separatorBuilder: (_, __) => SizedBox(height: separatorHeight),
      itemBuilder: (_, __) => LoadingSkeleton(
        height: itemHeight,
        borderRadius: borderRadius,
      ),
    );
  }
}

/// Skeleton box for custom-sized loading placeholders
class SkeletonBox extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;
  final bool showShimmer;

  const SkeletonBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = AppRadius.xs,
    this.showShimmer = true,
  });

  @override
  Widget build(BuildContext context) {
    return LoadingSkeleton(
      width: width,
      height: height,
      borderRadius: borderRadius,
      showShimmer: showShimmer,
    );
  }
}

/// Skeleton card for card-shaped loading placeholders
class SkeletonCard extends StatelessWidget {
  final double height;
  final double? width;
  final EdgeInsets? padding;
  final EdgeInsets? margin;

  const SkeletonCard({
    super.key,
    this.height = 100,
    this.width,
    this.padding,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      margin: margin ?? const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: padding ?? const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              LoadingSkeleton(
                height: 36,
                width: 36,
                borderRadius: AppRadius.sm,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    LoadingSkeleton(
                      height: 14,
                      width: 150,
                      borderRadius: AppRadius.xs,
                    ),
                    const SizedBox(height: AppSpacing.xxs),
                    LoadingSkeleton(
                      height: 10,
                      width: 80,
                      borderRadius: AppRadius.xs,
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: AppSpacing.sm),
          LoadingSkeleton(
            height: 10,
            width: double.infinity,
            borderRadius: AppRadius.xs,
          ),
        ],
      ),
    );
  }
}