import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimensions.dart';
import '../../../../core/di/injection.dart';
import '../bloc/auth_bloc.dart';
import '../../../../routes/app_router.dart';
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
    await Future.delayed(const Duration(milliseconds: 2500));

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
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.accent.withValues(alpha: 0.3),
                      blurRadius: 30,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Image.asset(
                    'assets/icons/logo.png',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      // Fallback to icon if logo not found
                      return Container(
                        color: AppColors.accent.withValues(alpha: 0.1),
                        child: Icon(
                          Icons.shield_outlined,
                          size: 50,
                          color: AppColors.accent,
                        ),
                      );
                    },
                  ),
                ),
              )
                  .animate()
                  .fadeIn(duration: const Duration(milliseconds: 800))
                  .scale(
                    begin: const Offset(0.6, 0.6),
                    end: const Offset(1, 1),
                    duration: const Duration(milliseconds: 800),
                    curve: Curves.elasticOut,
                  )
                  .then()
                  .shimmer(
                    duration: const Duration(milliseconds: 1200),
                    color: AppColors.accentLight.withValues(alpha: 0.3),
                  ),
              const SizedBox(height: AppSpacing.xl),
              // App name with typing effect
              Text(
                'Secure Environment',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.5,
                ),
              )
                  .animate()
                  .fadeIn(
                    delay: const Duration(milliseconds: 500),
                    duration: const Duration(milliseconds: 600),
                  )
                  .slideY(
                    begin: 0.3,
                    end: 0,
                    delay: const Duration(milliseconds: 500),
                    duration: const Duration(milliseconds: 600),
                    curve: Curves.easeOut,
                  ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Manager',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accent,
                      letterSpacing: -1,
                    ),
                  )
                      .animate()
                      .fadeIn(
                        delay: const Duration(milliseconds: 700),
                        duration: const Duration(milliseconds: 600),
                      )
                      .scale(
                        begin: const Offset(0.8, 0.8),
                        end: const Offset(1, 1),
                        delay: const Duration(milliseconds: 700),
                        duration: const Duration(milliseconds: 600),
                        curve: Curves.easeOut,
                      ),
                  const SizedBox(width: 8),
                  Container(
                    width: 8,
                    height: 32,
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  )
                      .animate(onPlay: (controller) => controller.repeat())
                      .fadeIn(
                        delay: const Duration(milliseconds: 1000),
                        duration: const Duration(milliseconds: 300),
                      )
                      .then()
                      .fadeOut(
                        duration: const Duration(milliseconds: 300),
                      )
                      .then()
                      .fadeIn(
                        duration: const Duration(milliseconds: 300),
                      ),
                ],
              ),
              const SizedBox(height: AppSpacing.xxl),
              // Loading indicator with pulse
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Loading...',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(
                    delay: const Duration(milliseconds: 1000),
                    duration: const Duration(milliseconds: 400),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}