import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:local_auth/local_auth.dart';
import 'package:sem_mobile/core/di/injection.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/core/theme/app_theme.dart';
import 'package:sem_mobile/features/sessions/domain/entities/session.dart';
import 'package:sem_mobile/features/sessions/presentation/bloc/session_bloc.dart';
import 'package:sem_mobile/features/sessions/presentation/bloc/session_event.dart';
import 'package:sem_mobile/features/sessions/presentation/bloc/session_state.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_loader.dart';

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
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Sessions & Devices'),
        backgroundColor: AppTheme.surfaceColor,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primaryColor,
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
                  icon: Icon(Icons.logout, color: AppTheme.errorColor),
                  label: Text('Revoke All', style: TextStyle(color: AppTheme.errorColor)),
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
        },
        builder: (context, state) {
          if (state.status == SessionStatus.loading && state.sessions.isEmpty) {
            return const Center(child: AppLoader());
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
        backgroundColor: AppTheme.surfaceColor,
        title: const Text('Revoke All Sessions?'),
        content: const Text(
          'This will log you out from all devices except the current one. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<SessionBloc>().add(const SessionRevokeAllRequested());
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('Revoke All'),
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
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.device_unknown, size: 64, color: AppTheme.textSecondary),
            const SizedBox(height: 16),
            Text('No active sessions', style: TextStyle(color: AppTheme.textSecondary)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<SessionBloc>().add(const SessionRefreshRequested());
        await Future.delayed(const Duration(milliseconds: 500));
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
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
        backgroundColor: AppTheme.surfaceColor,
        title: const Text('Revoke Session?'),
        content: Text(
          'This will end the session on ${session.deviceName ?? 'this device'}.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<SessionBloc>().add(SessionRevokeRequested(sessionId: session.id));
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

class _DevicesTab extends StatelessWidget {
  final SessionState state;

  const _DevicesTab({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state.devices.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.devices, size: 64, color: AppTheme.textSecondary),
            const SizedBox(height: 16),
            Text('No devices registered', style: TextStyle(color: AppTheme.textSecondary)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<SessionBloc>().add(const SessionRefreshRequested());
        await Future.delayed(const Duration(milliseconds: 500));
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
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
        backgroundColor: AppTheme.surfaceColor,
        title: const Text('Remove Device?'),
        content: Text(
          'This will revoke all sessions on ${device.name}.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<SessionBloc>().add(SessionRevokeDeviceRequested(device.id));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  void _trustDevice(BuildContext context, Device device) {
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
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: session.isCurrent
            ? Border.all(color: AppTheme.primaryColor, width: 2)
            : null,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(session.platformIcon, style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            session.deviceName ?? 'Unknown Device',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                            ),
                          ),
                          if (session.isCurrent) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'CURRENT',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                          if (session.isSuspicious) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.errorColor,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.warning, size: 10, color: Colors.white),
                                  const SizedBox(width: 2),
                                  const Text(
                                    'SUSPICIOUS',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        session.relativeLastActive,
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (onRevoke != null)
                  IconButton(
                    icon: Icon(Icons.close, color: AppTheme.errorColor),
                    onPressed: onRevoke,
                  ),
              ],
            ),
            if (session.ipAddress != null || session.location != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  if (session.ipAddress != null) ...[
                    Icon(Icons.location_on, size: 12, color: AppTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      session.ipAddress!,
                      style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                  if (session.location != null) ...[
                    const SizedBox(width: 12),
                    Text(
                      session.location!,
                      style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
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
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: device.isCurrent
            ? Border.all(color: AppTheme.primaryColor, width: 2)
            : null,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(device.platformIcon, style: const TextStyle(fontSize: 32)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              device.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (device.isCurrent) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryColor,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'THIS DEVICE',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                          if (device.isTrusted) ...[
                            const SizedBox(width: 8),
                            Icon(Icons.verified, size: 14, color: AppTheme.successColor),
                          ],
                          if (device.isSuspicious) ...[
                            const SizedBox(width: 8),
                            Icon(Icons.warning, size: 14, color: AppTheme.errorColor),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${device.sessionCount} session${device.sessionCount != 1 ? 's' : ''}',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (device.location != null) ...[
                  Icon(Icons.location_on, size: 12, color: AppTheme.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    device.location!,
                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(width: 12),
                ],
                Icon(Icons.access_time, size: 12, color: AppTheme.textSecondary),
                const SizedBox(width: 4),
                Text(
                  'Last active ${device.relativeLastActive}',
                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
              ],
            ),
            if (!device.isCurrent) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (onTrust != null)
                    TextButton.icon(
                      onPressed: onTrust,
                      icon: const Icon(Icons.verified_outlined, size: 16),
                      label: const Text('Trust'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppTheme.successColor,
                      ),
                    ),
                  const Spacer(),
                  if (onRevokeSessions != null)
                    TextButton.icon(
                      onPressed: onRevokeSessions,
                      icon: Icon(Icons.delete_outline, size: 16, color: AppTheme.errorColor),
                      label: Text('Remove', style: TextStyle(color: AppTheme.errorColor)),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}