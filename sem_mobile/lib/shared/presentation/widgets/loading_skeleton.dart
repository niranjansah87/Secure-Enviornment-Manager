import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:sem_mobile/core/theme/app_colors.dart';
import 'package:sem_mobile/core/theme/app_dimensions.dart';

/// Loading skeleton widget with shimmer effect
class LoadingSkeleton extends StatelessWidget {
  final double height;
  final double width;
  final double borderRadius;

  const LoadingSkeleton({
    super.key,
    this.height = 20,
    this.width = double.infinity,
    this.borderRadius = AppRadius.xs,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.surface,
      highlightColor: AppColors.surfaceLight,
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

  const SkeletonList({
    super.key,
    this.itemCount = 6,
    this.itemHeight = 72,
    this.borderRadius = AppRadius.md,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
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

  const SkeletonBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = AppRadius.xs,
  });

  @override
  Widget build(BuildContext context) {
    return LoadingSkeleton(
      width: width,
      height: height,
      borderRadius: borderRadius,
    );
  }
}