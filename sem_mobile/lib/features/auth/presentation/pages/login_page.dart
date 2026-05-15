import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimensions.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/presentation/widgets/app_button.dart';
import '../../../../shared/presentation/widgets/app_text_field.dart';
import '../../../../shared/presentation/widgets/app_card.dart';
import '../bloc/auth_bloc.dart';
import '../../../../routes/app_router.dart';

/// Login page with enterprise styling
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  final _usernameFocus = FocusNode();
  final _passwordFocus = FocusNode();

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _usernameFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  void _login() {
    // Dismiss keyboard
    FocusScope.of(context).unfocus();
    HapticFeedback.lightImpact();
    getIt<AuthBloc>().add(AuthLoginRequested(
      username: _usernameController.text.trim(),
      password: _passwordController.text,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.authenticated) {
          HapticFeedback.mediumImpact();
          context.goToDashboard();
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            child: Column(
              children: [
                const SizedBox(height: AppSpacing.xxl * 2),
                // Logo
                _buildHeader(),
                const SizedBox(height: AppSpacing.xxl),
                // Form
                _buildForm(),
                const SizedBox(height: AppSpacing.lg),
                // Biometric option
                _buildBiometricOption(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: AppColors.accent.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
              color: AppColors.accent.withValues(alpha: 0.3),
            ),
          ),
          child: const Icon(
            Icons.shield_outlined,
            size: AppSpacing.iconSizeLg,
            color: AppColors.accent,
          ),
        )
            .animate()
            .fadeIn(duration: const Duration(milliseconds: AppDurations.slower))
            .scale(
              begin: const Offset(0.9, 0.9),
              end: const Offset(1, 1),
            ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          'Welcome back',
          style: AppTypography.headlineMedium.copyWith(
            color: AppColors.textPrimary,
          ),
        ).animate().fadeIn(delay: const Duration(milliseconds: AppDurations.fast)),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          'Sign in to access your environments',
          style: AppTypography.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ).animate().fadeIn(delay: const Duration(milliseconds: AppDurations.slow)),
      ],
    );
  }

  Widget _buildForm() {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final isLoading = state.status == AuthStatus.loading;
        final errorMessage = state.failure?.message;

        return AppCard(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppTextField(
                controller: _usernameController,
                label: 'Username',
                hint: 'Enter your username',
                prefixIcon: const Icon(Icons.person_outline,
                    color: AppColors.textTertiary),
                enabled: !isLoading,
                textInputAction: TextInputAction.next,
                onSubmitted: (_) => _passwordFocus.requestFocus(),
              ),
              const SizedBox(height: AppSpacing.md),
              AppTextField(
                controller: _passwordController,
                label: 'Password',
                hint: 'Enter your password',
                obscureText: _obscurePassword,
                showVisibilityToggle: true,
                prefixIcon: const Icon(Icons.lock_outline,
                    color: AppColors.textTertiary),
                enabled: !isLoading,
                focusNode: _passwordFocus,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _login(),
              ),
              if (errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    border: Border.all(
                      color: AppColors.error.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline,
                          color: AppColors.error, size: 18),
                      const SizedBox(width: AppSpacing.xs),
                      Expanded(
                        child: Text(
                          errorMessage,
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'Sign In',
                onPressed: isLoading ? null : _login,
                isLoading: isLoading,
                isExpanded: true,
                leadingIcon: Icons.login,
              ),
            ],
          ),
        ).animate().fadeIn(delay: const Duration(milliseconds: AppDurations.slower));
      },
    );
  }

  Widget _buildBiometricOption() {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (!state.biometricAvailable) return const SizedBox.shrink();

        return Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 1,
                  color: AppColors.border,
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  child: Text(
                    'or',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                ),
                Container(
                  width: 40,
                  height: 1,
                  color: AppColors.border,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            AppButton(
              label: 'Sign in with Biometrics',
              onPressed: () {
                HapticFeedback.lightImpact();
                getIt<AuthBloc>().add(const AuthBiometricRequested());
              },
              variant: AppButtonVariant.outlined,
              isExpanded: true,
              leadingIcon: Icons.fingerprint,
            ),
          ],
        ).animate().fadeIn(delay: const Duration(milliseconds: AppDurations.slower));
      },
    );
  }
}