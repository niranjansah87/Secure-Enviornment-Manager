import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:local_auth/local_auth.dart';
import 'package:sem_mobile/core/di/injection.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/core/security/secure_clipboard.dart';
import 'package:sem_mobile/core/theme/app_theme.dart';
import 'package:sem_mobile/features/api_keys/domain/entities/api_key.dart';
import 'package:sem_mobile/features/api_keys/presentation/bloc/api_key_bloc.dart';
import 'package:sem_mobile/features/api_keys/presentation/bloc/api_key_event.dart';
import 'package:sem_mobile/features/api_keys/presentation/bloc/api_key_state.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_loader.dart';
import 'package:sem_mobile/shared/presentation/widgets/loading_skeleton.dart';

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
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('API Keys'),
        backgroundColor: AppTheme.surfaceColor,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
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
                backgroundColor: AppTheme.errorColor,
              ),
            );
          }
          if (state.successMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.successMessage!),
                backgroundColor: AppTheme.successColor,
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
                  await Future.delayed(const Duration(milliseconds: 500));
                },
                child: CustomScrollView(
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.all(16),
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
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        sliver: SliverToBoxAdapter(
                          child: Text(
                            'INACTIVE KEYS',
                            style: TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.all(16),
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
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(Icons.add),
        label: const Text('Create Key'),
      ),
    );
  }

  void _showApiKeyCreatedDialog(BuildContext context, ApiKeyState state) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        title: Row(
          children: [
            Icon(Icons.check_circle, color: AppTheme.successColor),
            const SizedBox(width: 8),
            const Text('API Key Created'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Copy this key now. It will not be shown again.',
              style: TextStyle(color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.dividerColor),
              ),
              child: SelectableText(
                state.rawKeyForDisplay ?? '',
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
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
            child: const Text('COPY'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('DONE'),
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
      backgroundColor: AppTheme.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
          left: 24,
          right: 24,
          top: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Create API Key',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: nameController,
              decoration: InputDecoration(
                labelText: 'Key Name',
                hintText: 'e.g., Production Backend',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Permissions',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
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
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
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
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                    ),
                    child: const Text('Create'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _confirmRevoke(BuildContext context, ApiKey key) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        title: const Text('Revoke API Key?'),
        content: Text(
          'This will immediately invalidate the key "${key.name}". This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<ApiKeyBloc>().add(ApiKeyRevokeRequested(key.id));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('Revoke'),
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
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: isInactive
            ? Border.all(color: AppTheme.dividerColor.withValues(alpha: 0.5))
            : null,
      ),
      child: Opacity(
        opacity: isInactive ? 0.6 : 1.0,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.key,
                      color: AppTheme.primaryColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          apiKey.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          apiKey.maskedDisplay,
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: apiKey.statusLabel),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: apiKey.permissions.map((p) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      p.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: AppTheme.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Last used ${apiKey.relativeLastUsed}',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  if (onRevoke != null)
                    TextButton.icon(
                      onPressed: onRevoke,
                      icon: Icon(Icons.delete_outline, size: 16, color: AppTheme.errorColor),
                      label: Text('Revoke', style: TextStyle(color: AppTheme.errorColor)),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                      ),
                    ),
                ],
              ),
            ],
          ),
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
        color = AppTheme.successColor;
        break;
      case 'expired':
        color = AppTheme.warningColor;
        break;
      default:
        color = AppTheme.textSecondary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
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
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.key_off,
                size: 64,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No API Keys',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Create your first API key to integrate with external services.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onCreatePressed,
              icon: const Icon(Icons.add),
              label: const Text('Create API Key'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
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
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.cardColor,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  SkeletonBox(width: 40, height: 40),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SkeletonBox(width: 150, height: 16),
                        SizedBox(height: 8),
                        SkeletonBox(width: 200, height: 12),
                      ],
                    ),
                  ),
                ],
              ),
              SizedBox(height: 12),
              Row(
                children: [
                  SkeletonBox(width: 60, height: 24),
                  SizedBox(width: 8),
                  SkeletonBox(width: 60, height: 24),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}