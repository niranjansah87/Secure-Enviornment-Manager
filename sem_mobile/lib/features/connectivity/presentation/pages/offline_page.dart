import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:go_router/go_router.dart';
import 'package:sem_mobile/core/theme/app_colors.dart';
import 'package:sem_mobile/core/theme/app_dimensions.dart';
import 'package:sem_mobile/core/theme/app_typography.dart';
import 'package:sem_mobile/core/utils/connectivity_service.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_button.dart';

/// Offline page shown when network is unavailable
class OfflinePage extends StatefulWidget {
  final VoidCallback? onRetry;

  const OfflinePage({super.key, this.onRetry});

  @override
  State<OfflinePage> createState() => _OfflinePageState();
}

class _OfflinePageState extends State<OfflinePage> {
  StreamSubscription<bool>? _connectivitySubscription;
  bool _isRetrying = false;

  @override
  void initState() {
    super.initState();
    _listenForConnectivity();
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  void _listenForConnectivity() {
    _connectivitySubscription = ConnectivityService.instance.onConnectivityChanged.listen(
      (isConnected) {
        if (isConnected && mounted) {
          widget.onRetry?.call();
          context.go('/');
        }
      },
    );
  }

  Future<void> _handleRetry() async {
    HapticFeedback.mediumImpact();
    setState(() => _isRetrying = true);

    // Check current connectivity status
    final isConnected = await ConnectivityService.instance.isConnected;
    if (isConnected && mounted) {
      widget.onRetry?.call();
      context.go('/');
    } else if (mounted) {
      setState(() => _isRetrying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Offline icon
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.cloud_off_rounded,
                  size: AppSpacing.iconSizeXl,
                  color: AppColors.warning,
                ),
              )
                  .animate()
                  .fadeIn(duration: const Duration(milliseconds: 600))
                  .scale(
                    begin: const Offset(0.8, 0.8),
                    end: const Offset(1, 1),
                    duration: const Duration(milliseconds: 600),
                    curve: Curves.easeOut,
                  ),
              const SizedBox(height: AppSpacing.xxl),
              // Title
              Text(
                'You\'re Offline',
                style: AppTypography.titleLarge.copyWith(
                  color: AppColors.textPrimary,
                ),
              )
                  .animate()
                  .fadeIn(
                    delay: const Duration(milliseconds: 200),
                    duration: const Duration(milliseconds: 600),
                  )
                  .slideY(
                    begin: 0.3,
                    end: 0,
                    delay: const Duration(milliseconds: 200),
                    duration: const Duration(milliseconds: 600),
                    curve: Curves.easeOut,
                  ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Please check your internet connection\nand try again.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
              )
                  .animate()
                  .fadeIn(
                    delay: const Duration(milliseconds: 400),
                    duration: const Duration(milliseconds: 600),
                  ),
              const SizedBox(height: AppSpacing.xxl),
              // Retry button
              SizedBox(
                width: double.infinity,
                height: AppSpacing.buttonHeightMd,
                child: AppButton(
                  onPressed: _isRetrying ? null : _handleRetry,
                  label: _isRetrying ? 'Checking...' : 'Retry',
                  leadingIcon: _isRetrying ? null : Icons.refresh_rounded,
                  isLoading: _isRetrying,
                ),
              )
                  .animate()
                  .fadeIn(
                    delay: const Duration(milliseconds: 600),
                    duration: const Duration(milliseconds: 400),
                  )
                  .slideY(
                    begin: 0.2,
                    end: 0,
                    delay: const Duration(milliseconds: 600),
                    duration: const Duration(milliseconds: 400),
                    curve: Curves.easeOut,
                  ),
              const SizedBox(height: AppSpacing.lg),
              // Info text
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.info_outline,
                    size: AppSpacing.iconSizeSm,
                    color: AppColors.textTertiary,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    'Your data is stored securely offline',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(
                    delay: const Duration(milliseconds: 800),
                    duration: const Duration(milliseconds: 400),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}