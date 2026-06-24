import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:sem_mobile/core/theme/app_colors.dart';
import 'package:sem_mobile/core/theme/app_dimensions.dart';
import 'package:sem_mobile/core/theme/app_typography.dart';
import 'package:sem_mobile/core/di/injection.dart';
import 'package:sem_mobile/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:sem_mobile/routes/app_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// Splash screen - initializes app on startup
class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    // Check auth status after animation completes
    await Future.delayed(const Duration(milliseconds: AppDurations.slower));

    if (!mounted) return;

    final authBloc = getIt<AuthBloc>();
    authBloc.add(const AuthCheckRequested());
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.authenticated) {
          context.goToDashboard();
        } else if (state.status == AuthStatus.unauthenticated) {
          context.goToLogin();
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Logo with animation
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.accent.withValues(alpha: 0.3),
                      blurRadius: AppShadows.xlBlur,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  child: Image.asset(
                    'assets/icons/logo.png',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      // Fallback to icon if logo not found
                      return Container(
                        color: AppColors.accent.withValues(alpha: 0.1),
                        child: Icon(
                          Icons.shield_outlined,
                          size: AppSpacing.iconSizeXl,
                          color: AppColors.accent,
                        ),
                      );
                    },
                  ),
                ),
              )
                  .animate()
                  .fadeIn(duration: const Duration(milliseconds: AppDurations.slower))
                  .scale(
                    begin: const Offset(0.6, 0.6),
                    end: const Offset(1, 1),
                    duration: const Duration(milliseconds: AppDurations.slower),
                    curve: Curves.elasticOut,
                  )
                  .then()
                  .shimmer(
                    duration: const Duration(milliseconds: AppDurations.shimmerCycle),
                    color: AppColors.accentLight.withValues(alpha: 0.3),
                  ),
              const SizedBox(height: AppSpacing.xl),
              // App name with typing effect
              Text(
                'Secure Environment',
                style: AppTypography.headlineMedium.copyWith(
                  color: AppColors.textPrimary,
                  letterSpacing: -0.5,
                ),
              )
                  .animate()
                  .fadeIn(
                    delay: const Duration(milliseconds: AppDurations.fast),
                    duration: const Duration(milliseconds: AppDurations.normal),
                  )
                  .slideY(
                    begin: 0.3,
                    end: 0,
                    delay: const Duration(milliseconds: AppDurations.fast),
                    duration: const Duration(milliseconds: AppDurations.normal),
                    curve: Curves.easeOut,
                  ),
              const SizedBox(height: AppSpacing.xxs),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Manager',
                    style: AppTypography.headlineLarge.copyWith(
                      color: AppColors.accent,
                      letterSpacing: -1,
                    ),
                  )
                      .animate()
                      .fadeIn(
                        delay: const Duration(milliseconds: AppDurations.slow),
                        duration: const Duration(milliseconds: AppDurations.normal),
                      )
                      .scale(
                        begin: const Offset(0.8, 0.8),
                        end: const Offset(1, 1),
                        delay: const Duration(milliseconds: AppDurations.slow),
                        duration: const Duration(milliseconds: AppDurations.normal),
                        curve: Curves.easeOut,
                      ),
                  const SizedBox(width: AppSpacing.xs),
                  Container(
                    width: AppSpacing.xs,
                    height: AppSpacing.xxl,
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(AppRadius.xs),
                    ),
                  )
                      .animate(onPlay: (controller) => controller.repeat())
                      .fadeIn(
                        delay: const Duration(milliseconds: AppDurations.slower),
                        duration: const Duration(milliseconds: AppDurations.fast),
                      )
                      .then()
                      .fadeOut(
                        duration: const Duration(milliseconds: AppDurations.fast),
                      )
                      .then()
                      .fadeIn(
                        duration: const Duration(milliseconds: AppDurations.fast),
                      ),
                ],
              ),
              const SizedBox(height: AppSpacing.xxl),
              // Loading indicator with pulse
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: AppSpacing.iconSizeSm,
                    height: AppSpacing.iconSizeSm,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'Loading...',
                    style: AppTypography.bodyMedium.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(
                    delay: const Duration(milliseconds: AppDurations.slower),
                    duration: const Duration(milliseconds: AppDurations.normal),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}