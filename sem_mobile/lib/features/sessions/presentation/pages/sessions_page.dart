import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:local_auth/local_auth.dart';
import 'package:sem_mobile/core/di/injection.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/core/theme/app_colors.dart';
import 'package:sem_mobile/core/theme/app_dimensions.dart';
import 'package:sem_mobile/core/theme/app_typography.dart';
import 'package:sem_mobile/features/sessions/domain/entities/session.dart';
import 'package:sem_mobile/features/sessions/presentation/bloc/session_bloc.dart';
import 'package:sem_mobile/features/sessions/presentation/bloc/session_event.dart';
import 'package:sem_mobile/features/sessions/presentation/bloc/session_state.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_card.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_button.dart';
import 'package:sem_mobile/shared/presentation/widgets/empty_state.dart';

class SessionsPage extends StatelessWidget {
  const SessionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<SessionBloc>()..add(const SessionLoadRequested()),
      child: const _SessionsPageContent(),
    );
  }
}

class _SessionsPageContent extends StatefulWidget {
  const _SessionsPageContent();

  @override
  State<_SessionsPageContent> createState() => _SessionsPageContentState();
}

class _SessionsPageContentState extends State<_SessionsPageContent>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final LocalAuthentication _localAuth = LocalAuthentication();
  bool _canCheckBiometrics = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
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
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Sessions & Devices',
          style: AppTypography.titleLarge.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.background,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.accent,
          labelColor: AppColors.textPrimary,
          unselectedLabelColor: AppColors.textSecondary,
          tabs: const [
            Tab(text: 'Sessions'),
            Tab(text: 'Devices'),
          ],
        ),
        actions: [
          BlocBuilder<SessionBloc, SessionState>(
            builder: (context, state) {
              if (state.nonCurrentSessions.isNotEmpty) {
                return TextButton.icon(
                  onPressed: () => _confirmRevokeAll(context),
                  icon: Icon(Icons.logout, color: AppColors.error, size: AppSpacing.iconSizeSm),
                  label: Text('Revoke All', style: AppTypography.labelLarge.copyWith(color: AppColors.error)),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
      body: BlocConsumer<SessionBloc, SessionState>(
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
        },
        builder: (context, state) {
          if (state.status == SessionStatus.loading && state.sessions.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          return TabBarView(
            controller: _tabController,
            children: [
              _SessionsTab(state: state),
              _DevicesTab(state: state),
            ],
          );
        },
      ),
    );
  }

  void _confirmRevokeAll(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Revoke All Sessions?', style: AppTypography.titleLarge.copyWith(color: AppColors.textPrimary)),
        content: Text(
          'This will log you out from all devices except the current one. Continue?',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('Cancel', style: AppTypography.labelLarge.copyWith(color: AppColors.textSecondary)),
          ),
          AppButton(
            label: 'Revoke All',
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<SessionBloc>().add(const SessionRevokeAllRequested());
            },
            variant: AppButtonVariant.danger,
            size: AppButtonSize.small,
          ),
        ],
      ),
    );
  }
}

class _SessionsTab extends StatelessWidget {
  final SessionState state;

  const _SessionsTab({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state.sessions.isEmpty) {
      return EmptyState(
        icon: Icons.device_unknown,
        title: 'No active sessions',
        description: 'Sessions will appear here when you sign in from multiple devices',
        iconColor: AppColors.textTertiary,
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<SessionBloc>().add(const SessionRefreshRequested());
        await Future.delayed(const Duration(milliseconds: 500));
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: state.sessions.length,
        itemBuilder: (context, index) {
          final session = state.sessions[index];
          return _SessionCard(
            session: session,
            onRevoke: session.isCurrent
                ? null
                : () => _confirmRevokeSession(context, session),
          );
        },
      ),
    );
  }

  void _confirmRevokeSession(BuildContext context, Session session) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Revoke Session?', style: AppTypography.titleLarge.copyWith(color: AppColors.textPrimary)),
        content: Text(
          'This will end the session on ${session.deviceName ?? 'this device'}.',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('Cancel', style: AppTypography.labelLarge.copyWith(color: AppColors.textSecondary)),
          ),
          AppButton(
            label: 'Revoke',
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<SessionBloc>().add(SessionRevokeRequested(sessionId: session.id));
            },
            variant: AppButtonVariant.danger,
            size: AppButtonSize.small,
          ),
        ],
      ),
    );
  }
}

class _DevicesTab extends StatelessWidget {
  final SessionState state;

  const _DevicesTab({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state.devices.isEmpty) {
      return EmptyState(
        icon: Icons.devices,
        title: 'No devices registered',
        description: 'Devices you trust will appear here',
        iconColor: AppColors.textTertiary,
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<SessionBloc>().add(const SessionRefreshRequested());
        await Future.delayed(const Duration(milliseconds: 500));
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: state.devices.length,
        itemBuilder: (context, index) {
          final device = state.devices[index];
          return _DeviceCard(
            device: device,
            onRevokeSessions: () => _confirmRevokeDevice(context, device),
            onTrust: device.isTrusted ? null : () => _trustDevice(context, device),
          );
        },
      ),
    );
  }

  void _confirmRevokeDevice(BuildContext context, Device device) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Remove Device?', style: AppTypography.titleLarge.copyWith(color: AppColors.textPrimary)),
        content: Text(
          'This will revoke all sessions on ${device.name}.',
          style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text('Cancel', style: AppTypography.labelLarge.copyWith(color: AppColors.textSecondary)),
          ),
          AppButton(
            label: 'Remove',
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<SessionBloc>().add(SessionRevokeDeviceRequested(device.id));
            },
            variant: AppButtonVariant.danger,
            size: AppButtonSize.small,
          ),
        ],
      ),
    );
  }

  void _trustDevice(BuildContext context, Device device) {
    HapticFeedback.mediumImpact();
    context.read<SessionBloc>().add(SessionDeviceTrustRequested(device.id));
  }
}

class _SessionCard extends StatelessWidget {
  final Session session;
  final VoidCallback? onRevoke;

  const _SessionCard({
    required this.session,
    this.onRevoke,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      isHighlighted: session.isCurrent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(session.platformIcon, style: const TextStyle(fontSize: 24)),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            session.deviceName ?? 'Unknown Device',
                            style: AppTypography.titleSmall.copyWith(
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        if (session.isCurrent) ...[
                          const SizedBox(width: AppSpacing.xs),
                          _buildBadge('CURRENT', AppColors.accent),
                        ],
                        if (session.isSuspicious) ...[
                          const SizedBox(width: AppSpacing.xs),
                          _buildBadge('SUSPICIOUS', AppColors.error, Icons.warning),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      session.relativeLastActive,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (onRevoke != null)
                IconButton(
                  icon: Icon(Icons.close, color: AppColors.error, size: AppSpacing.iconSizeSm),
                  onPressed: onRevoke,
                ),
            ],
          ),
          if (session.ipAddress != null || session.location != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                if (session.ipAddress != null) ...[
                  Icon(Icons.location_on, size: 12, color: AppColors.textTertiary),
                  const SizedBox(width: 4),
                  Text(
                    session.ipAddress!,
                    style: AppTypography.bodySmall.copyWith(color: AppColors.textTertiary),
                  ),
                ],
                if (session.location != null) ...[
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    session.location!,
                    style: AppTypography.bodySmall.copyWith(color: AppColors.textTertiary),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBadge(String label, Color color, [IconData? icon]) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.xs),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 10, color: color),
            const SizedBox(width: 2),
          ],
          Text(
            label,
            style: AppTypography.labelSmall.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _DeviceCard extends StatelessWidget {
  final Device device;
  final VoidCallback? onRevokeSessions;
  final VoidCallback? onTrust;

  const _DeviceCard({
    required this.device,
    this.onRevokeSessions,
    this.onTrust,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      isHighlighted: device.isCurrent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(device.platformIcon, style: const TextStyle(fontSize: 32)),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            device.name,
                            style: AppTypography.titleSmall.copyWith(
                              color: AppColors.textPrimary,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (device.isCurrent) ...[
                          const SizedBox(width: AppSpacing.xs),
                          _buildBadge('THIS DEVICE', AppColors.accent),
                        ],
                        if (device.isTrusted) ...[
                          const SizedBox(width: AppSpacing.xs),
                          Icon(Icons.verified, size: 14, color: AppColors.success),
                        ],
                        if (device.isSuspicious) ...[
                          const SizedBox(width: AppSpacing.xs),
                          Icon(Icons.warning, size: 14, color: AppColors.error),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${device.sessionCount} session${device.sessionCount != 1 ? 's' : ''}',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              if (device.location != null) ...[
                Icon(Icons.location_on, size: 12, color: AppColors.textTertiary),
                const SizedBox(width: 4),
                Text(
                  device.location!,
                  style: AppTypography.bodySmall.copyWith(color: AppColors.textTertiary),
                ),
                const SizedBox(width: AppSpacing.sm),
              ],
              Icon(Icons.access_time, size: 12, color: AppColors.textTertiary),
              const SizedBox(width: 4),
              Text(
                'Last active ${device.relativeLastActive}',
                style: AppTypography.bodySmall.copyWith(color: AppColors.textTertiary),
              ),
            ],
          ),
          if (!device.isCurrent) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                if (onTrust != null)
                  TextButton.icon(
                    onPressed: onTrust,
                    icon: const Icon(Icons.verified_outlined, size: 16),
                    label: const Text('Trust'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.success,
                    ),
                  ),
                const Spacer(),
                if (onRevokeSessions != null)
                  TextButton.icon(
                    onPressed: onRevokeSessions,
                    icon: Icon(Icons.delete_outline, size: 16, color: AppColors.error),
                    label: Text('Remove', style: AppTypography.labelMedium.copyWith(color: AppColors.error)),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBadge(String label, Color color, [IconData? icon]) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.xs),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: AppTypography.labelSmall.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}