import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:local_auth/local_auth.dart';
import 'package:sem_mobile/core/di/injection.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/core/security/secure_clipboard.dart';
import 'package:sem_mobile/core/theme/app_colors.dart';
import 'package:sem_mobile/core/theme/app_dimensions.dart';
import 'package:sem_mobile/core/theme/app_typography.dart';
import 'package:sem_mobile/features/api_keys/domain/entities/api_key.dart';
import 'package:sem_mobile/features/api_keys/presentation/bloc/api_key_bloc.dart';
import 'package:sem_mobile/features/api_keys/presentation/bloc/api_key_event.dart';
import 'package:sem_mobile/features/api_keys/presentation/bloc/api_key_state.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_loader.dart';
import 'package:sem_mobile/shared/presentation/widgets/loading_skeleton.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_button.dart';

class ApiKeysPage extends StatelessWidget {
  const ApiKeysPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<ApiKeyBloc>()..add(const ApiKeyLoadRequested()),
      child: const _ApiKeysPageContent(),
    );
  }
}

class _ApiKeysPageContent extends StatefulWidget {
  const _ApiKeysPageContent();

  @override
  State<_ApiKeysPageContent> createState() => _ApiKeysPageContentState();
}

class _ApiKeysPageContentState extends State<_ApiKeysPageContent> {
  final LocalAuthentication _localAuth = LocalAuthentication();
  bool _canCheckBiometrics = false;

  @override
  void initState() {
    super.initState();
    _checkBiometrics();
  }

  Future<void> _checkBiometrics() async {
    try {
      _canCheckBiometrics = await _localAuth.canCheckBiometrics;
    } catch (e) {
      _canCheckBiometrics = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'API Keys',
          style: AppTypography.titleLarge.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.background,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.textSecondary),
            onPressed: () => context.read<ApiKeyBloc>().add(const ApiKeyRefreshRequested()),
          ),
        ],
      ),
      body: BlocConsumer<ApiKeyBloc, ApiKeyState>(
        listener: (context, state) {
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: AppColors.error,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
              ),
            );
          }
          if (state.successMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.successMessage!),
                backgroundColor: AppColors.success,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
              ),
            );
          }
          if (state.status == ApiKeyStatus.created && state.rawKeyForDisplay != null) {
            _showApiKeyCreatedDialog(context, state);
          }
        },
        builder: (context, state) {
          if (state.status == ApiKeyStatus.loading && state.keys.isEmpty) {
            return const _ApiKeysSkeleton();
          }

          if (state.keys.isEmpty) {
            return _EmptyApiKeysView(
              onCreatePressed: () => _showCreateDialog(context),
            );
          }

          return Stack(
            children: [
              RefreshIndicator(
                onRefresh: () async {
                  context.read<ApiKeyBloc>().add(const ApiKeyRefreshRequested());
                  await Future.delayed(const Duration(milliseconds: AppDurations.toastDuration));
                },
                child: CustomScrollView(
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final key = state.activeKeys[index];
                            return _ApiKeyCard(
                              apiKey: key,
                              onRevoke: () => _confirmRevoke(context, key),
                            );
                          },
                          childCount: state.activeKeys.length,
                        ),
                      ),
                    ),
                    if (state.inactiveKeys.isNotEmpty) ...[
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                        sliver: SliverToBoxAdapter(
                          child: Text(
                            'INACTIVE KEYS',
                            style: AppTypography.labelSmall.copyWith(
                              color: AppColors.textTertiary,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final key = state.inactiveKeys[index];
                              return _ApiKeyCard(
                                apiKey: key,
                                onRevoke: null,
                                isInactive: true,
                              );
                            },
                            childCount: state.inactiveKeys.length,
                          ),
                        ),
                      ),
                    ],
                    const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
                  ],
                ),
              ),
              if (state.status == ApiKeyStatus.revoking || state.status == ApiKeyStatus.creating)
                Container(
                  color: Colors.black54,
                  child: const Center(child: AppLoader()),
                ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context),
        backgroundColor: AppColors.accent,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Create Key', style: TextStyle(color: Colors.white)),
      ),
    );
  }

  void _showApiKeyCreatedDialog(BuildContext context, ApiKeyState state) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.modal),
        ),
        title: Row(
          children: [
            Icon(Icons.check_circle, color: AppColors.success),
            const SizedBox(width: AppSpacing.sm),
            Text(
              'API Key Created',
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
              'Copy this key now. It will not be shown again.',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: AppColors.border),
              ),
              child: SelectableText(
                state.rawKeyForDisplay ?? '',
                style: AppTypography.codeMedium.copyWith(
                  color: AppColors.textPrimary,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              context.read<ApiKeyBloc>().add(ApiKeyCopied(state.newlyCreatedKey!.id));
              SecureClipboardManager.instance.copy(
                state.rawKeyForDisplay ?? '',
              );
            },
            child: Text(
              'COPY',
              style: AppTypography.labelLarge.copyWith(color: AppColors.accent),
            ),
          ),
          AppButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            label: 'DONE',
          ),
        ],
      ),
    );
  }

  void _showCreateDialog(BuildContext context) {
    final nameController = TextEditingController();
    final selectedPermissions = <String>[];
    DateTime? expiresAt;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
      ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
          left: AppSpacing.lg,
          right: AppSpacing.lg,
          top: AppSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Create API Key',
              style: AppTypography.titleLarge.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            TextField(
              controller: nameController,
              decoration: InputDecoration(
                labelText: 'Key Name',
                hintText: 'e.g., Production Backend',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Permissions',
              style: AppTypography.titleSmall.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: [
                'read', 'write', 'delete', 'admin',
              ].map((perm) {
                return FilterChip(
                  label: Text(perm),
                  selected: selectedPermissions.contains(perm),
                  onSelected: (selected) {
                    setState(() {
                      if (selected) {
                        selectedPermissions.add(perm);
                      } else {
                        selectedPermissions.remove(perm);
                      }
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    label: 'Cancel',
                    variant: AppButtonVariant.outlined,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: AppButton(
                    onPressed: () {
                      if (nameController.text.isNotEmpty && selectedPermissions.isNotEmpty) {
                        context.read<ApiKeyBloc>().add(ApiKeyCreateRequested(
                          name: nameController.text,
                          permissions: selectedPermissions,
                          expiresAt: expiresAt,
                        ));
                        Navigator.pop(sheetContext);
                      }
                    },
                    label: 'Create',
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }

  void _confirmRevoke(BuildContext context, ApiKey key) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.modal),
        ),
        title: Text(
          'Revoke API Key?',
          style: AppTypography.titleMedium.copyWith(
            color: AppColors.textPrimary,
          ),
        ),
        content: Text(
          'This will immediately invalidate the key "${key.name}". This action cannot be undone.',
          style: AppTypography.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              'Cancel',
              style: AppTypography.labelLarge.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
          AppButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<ApiKeyBloc>().add(ApiKeyRevokeRequested(key.id));
            },
            label: 'Revoke',
            variant: AppButtonVariant.danger,
            size: AppButtonSize.small,
          ),
        ],
      ),
    );
  }
}

class _ApiKeyCard extends StatelessWidget {
  final ApiKey apiKey;
  final VoidCallback? onRevoke;
  final bool isInactive;

  const _ApiKeyCard({
    required this.apiKey,
    this.onRevoke,
    this.isInactive = false,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: isInactive ? 0.6 : 1.0,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.card),
          border: isInactive
              ? Border.all(color: AppColors.border.withValues(alpha: 0.5))
              : Border.all(color: AppColors.border),
        ),
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(
                    Icons.key,
                    color: AppColors.accent,
                    size: AppSpacing.iconSizeSm,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        apiKey.name,
                        style: AppTypography.titleSmall.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxs),
                      Text(
                        apiKey.maskedDisplay,
                        style: AppTypography.codeMedium.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                _StatusBadge(status: apiKey.statusLabel),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.xxs,
              runSpacing: AppSpacing.xxs,
              children: apiKey.permissions.map((p) {
                return Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xs,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.xs),
                  ),
                  child: Text(
                    p.toUpperCase(),
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.accent,
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Icon(
                  Icons.access_time,
                  size: AppSpacing.iconSizeSm,
                  color: AppColors.textTertiary,
                ),
                const SizedBox(width: AppSpacing.xxs),
                Text(
                  'Last used ${apiKey.relativeLastUsed}',
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
                const Spacer(),
                if (onRevoke != null)
                  TextButton.icon(
                    onPressed: onRevoke,
                    icon: Icon(Icons.delete_outline, size: AppSpacing.iconSizeSm, color: AppColors.error),
                    label: Text(
                      'Revoke',
                      style: AppTypography.labelMedium.copyWith(color: AppColors.error),
                    ),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status.toLowerCase()) {
      case 'active':
        color = AppColors.success;
        break;
      case 'expired':
        color = AppColors.warning;
        break;
      default:
        color = AppColors.textSecondary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xs,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.xs),
      ),
      child: Text(
        status,
        style: AppTypography.labelSmall.copyWith(
          color: color,
        ),
      ),
    );
  }
}

class _EmptyApiKeysView extends StatelessWidget {
  final VoidCallback onCreatePressed;

  const _EmptyApiKeysView({required this.onCreatePressed});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.key_off,
                size: AppSpacing.iconSizeXl,
                color: AppColors.accent,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'No API Keys',
              style: AppTypography.titleLarge.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Create your first API key to integrate with external services.',
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            AppButton(
              onPressed: onCreatePressed,
              label: 'Create API Key',
              leadingIcon: Icons.add,
            ),
          ],
        ),
      ),
    );
  }
}

class _ApiKeysSkeleton extends StatelessWidget {
  const _ApiKeysSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: AppSpacing.sm),
          padding: const EdgeInsets.all(AppSpacing.md),
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
                    height: 40,
                    width: 40,
                    borderRadius: AppRadius.sm,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        LoadingSkeleton(
                          height: 16,
                          width: 150,
                          borderRadius: AppRadius.xs,
                        ),
                        const SizedBox(height: AppSpacing.xxs),
                        LoadingSkeleton(
                          height: 12,
                          width: 200,
                          borderRadius: AppRadius.xs,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  LoadingSkeleton(
                    height: 24,
                    width: 60,
                    borderRadius: AppRadius.xs,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  LoadingSkeleton(
                    height: 24,
                    width: 60,
                    borderRadius: AppRadius.xs,
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}