import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sem_mobile/core/di/injection.dart';
import 'package:sem_mobile/core/theme/app_theme.dart';
import 'package:sem_mobile/features/audit/domain/entities/audit_log.dart';
import 'package:sem_mobile/features/audit/domain/repositories/audit_repository.dart';
import 'package:sem_mobile/features/audit/presentation/bloc/audit_bloc.dart';
import 'package:sem_mobile/features/audit/presentation/bloc/audit_event.dart';
import 'package:sem_mobile/features/audit/presentation/bloc/audit_state.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_loader.dart';
import 'package:sem_mobile/shared/presentation/widgets/loading_skeleton.dart';

class AuditLogsPage extends StatelessWidget {
  const AuditLogsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<AuditBloc>()..add(const AuditLoadRequested()),
      child: const _AuditLogsPageContent(),
    );
  }
}

class _AuditLogsPageContent extends StatefulWidget {
  const _AuditLogsPageContent();

  @override
  State<_AuditLogsPageContent> createState() => _AuditLogsPageContentState();
}

class _AuditLogsPageContentState extends State<_AuditLogsPageContent> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<AuditBloc>().add(const AuditLoadMoreRequested());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Audit Logs'),
        backgroundColor: AppTheme.surfaceColor,
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterSheet(context),
          ),
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () => _showExportDialog(context),
          ),
        ],
      ),
      body: Column(
        children: [
          _SearchBar(controller: _searchController),
          Expanded(
            child: BlocBuilder<AuditBloc, AuditState>(
              builder: (context, state) {
                if (state.status == AuditStatus.loading && state.logs.isEmpty) {
                  return const _AuditLogsSkeleton();
                }

                if (state.logs.isEmpty) {
                  return _EmptyAuditView(
                    onClearFilters: () {
                      context.read<AuditBloc>().add(const AuditFilterChanged(AuditLogFilter()));
                    },
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<AuditBloc>().add(const AuditLoadRequested(refresh: true));
                    await Future.delayed(const Duration(milliseconds: 500));
                  },
                  child: CustomScrollView(
                    controller: _scrollController,
                    slivers: [
                      SliverPadding(
                        padding: const EdgeInsets.all(16),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final log = state.logs[index];
                              final isFirst = index == 0;
                              final isLast = index == state.logs.length - 1;
                              return _AuditTimelineItem(
                                log: log,
                                isFirst: isFirst,
                                isLast: isLast,
                                onTap: () => _showLogDetails(context, log),
                              );
                            },
                            childCount: state.logs.length,
                          ),
                        ),
                      ),
                      if (state.status == AuditStatus.loading)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(child: AppLoader(size: 24)),
                          ),
                        ),
                      if (state.hasReachedMax)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Center(
                              child: Text(
                                'No more logs',
                                style: TextStyle(color: AppTheme.textSecondary),
                              ),
                            ),
                          ),
                        ),
                      const SliverPadding(padding: EdgeInsets.only(bottom: 32)),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => BlocProvider.value(
        value: context.read<AuditBloc>(),
        child: const _FilterSheet(),
      ),
    );
  }

  void _showExportDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        title: const Text('Export Audit Logs'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.description),
              title: const Text('CSV'),
              onTap: () {
                Navigator.pop(dialogContext);
                context.read<AuditBloc>().add(const AuditExportRequested(format: 'csv'));
              },
            ),
            ListTile(
              leading: const Icon(Icons.code),
              title: const Text('JSON'),
              onTap: () {
                Navigator.pop(dialogContext);
                context.read<AuditBloc>().add(const AuditExportRequested(format: 'json'));
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showLogDetails(BuildContext context, AuditLog log) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => _LogDetailsSheet(log: log),
    );
  }
}

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;

  const _SearchBar({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      color: AppTheme.surfaceColor,
      child: TextField(
        controller: controller,
        decoration: InputDecoration(
          hintText: 'Search audit logs...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    controller.clear();
                    context.read<AuditBloc>().add(const AuditSearchRequested(''));
                  },
                )
              : null,
          filled: true,
          fillColor: AppTheme.backgroundColor,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
        onSubmitted: (value) {
          context.read<AuditBloc>().add(AuditSearchRequested(value));
        },
      ),
    );
  }
}

class _AuditTimelineItem extends StatelessWidget {
  final AuditLog log;
  final bool isFirst;
  final bool isLast;
  final VoidCallback onTap;

  const _AuditTimelineItem({
    required this.log,
    required this.isFirst,
    required this.isLast,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _TimelineIndicator(log: log, isFirst: isFirst, isLast: isLast),
          const SizedBox(width: 12),
          Expanded(
            child: _AuditEventCard(log: log, onTap: onTap),
          ),
        ],
      ),
    );
  }
}

class _TimelineIndicator extends StatelessWidget {
  final AuditLog log;
  final bool isFirst;
  final bool isLast;

  const _TimelineIndicator({
    required this.log,
    required this.isFirst,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 40,
      child: Column(
        children: [
          if (!isFirst)
            Container(
              width: 2,
              height: 8,
              color: _getSeverityColor().withValues(alpha: 0.3),
            ),
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: _getSeverityColor(),
              shape: BoxShape.circle,
              border: Border.all(
                color: _getSeverityColor().withValues(alpha: 0.3),
                width: 2,
              ),
            ),
          ),
          if (!isLast)
            Expanded(
              child: Container(
                width: 2,
                color: _getSeverityColor().withValues(alpha: 0.3),
              ),
            ),
        ],
      ),
    );
  }

  Color _getSeverityColor() {
    return switch (log.severity) {
      AuditSeverity.info => AppTheme.primaryColor,
      AuditSeverity.warning => AppTheme.warningColor,
      AuditSeverity.error => AppTheme.errorColor,
      AuditSeverity.critical => Colors.red.shade900,
    };
  }
}

class _AuditEventCard extends StatelessWidget {
  final AuditLog log;
  final VoidCallback onTap;

  const _AuditEventCard({
    required this.log,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: AppTheme.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: log.isSuspicious
              ? Border.all(color: AppTheme.warningColor.withValues(alpha: 0.5))
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (log.isSuspicious)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.warningColor.withValues(alpha: 0.1),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning, size: 14, color: AppTheme.warningColor),
                    const SizedBox(width: 6),
                    Text(
                      'Suspicious Activity Detected',
                      style: TextStyle(
                        color: AppTheme.warningColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _ActionIcon(action: log.action),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              log.actionDisplayName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              log.relativeTime,
                              style: TextStyle(
                                fontSize: 11,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      _SeverityBadge(severity: log.severity),
                    ],
                  ),
                  if (log.actorName != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.person_outline, size: 12, color: AppTheme.textSecondary),
                        const SizedBox(width: 4),
                        Text(
                          log.actorName!,
                          style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                        if (log.actorEmail != null) ...[
                          Text(
                            ' (${log.actorEmail})',
                            style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                          ),
                        ],
                      ],
                    ),
                  ],
                  if (log.resourceName != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.folder_outlined, size: 12, color: AppTheme.textSecondary),
                        const SizedBox(width: 4),
                        Text(
                          '${log.resourceType ?? 'Resource'}: ${log.resourceName}',
                          style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _InfoChip(
                        icon: Icons.access_time,
                        label: log.timestamp.toString().substring(0, 16),
                      ),
                      if (log.ipAddress != null) ...[
                        const SizedBox(width: 8),
                        _InfoChip(icon: Icons.location_on, label: log.ipAddress!),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionIcon extends StatelessWidget {
  final AuditAction action;

  const _ActionIcon({required this.action});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color color;

    switch (action) {
      case AuditAction.login:
      case AuditAction.logout:
        icon = Icons.login;
        color = AppTheme.primaryColor;
        break;
      case AuditAction.loginFailed:
        icon = Icons.login;
        color = AppTheme.errorColor;
        break;
      case AuditAction.secretCreated:
      case AuditAction.secretUpdated:
      case AuditAction.secretDeleted:
        icon = Icons.lock_outline;
        color = AppTheme.primaryColor;
        break;
      case AuditAction.secretViewed:
        icon = Icons.visibility;
        color = AppTheme.primaryColor;
        break;
      case AuditAction.apiKeyCreated:
      case AuditAction.apiKeyRevoked:
        icon = Icons.key;
        color = AppTheme.warningColor;
        break;
      case AuditAction.sessionCreated:
      case AuditAction.sessionRevoked:
        icon = Icons.devices;
        color = AppTheme.primaryColor;
        break;
      case AuditAction.deviceAdded:
      case AuditAction.deviceRemoved:
        icon = Icons.phone_android;
        color = AppTheme.primaryColor;
        break;
      case AuditAction.securityAlert:
      case AuditAction.suspiciousActivity:
        icon = Icons.warning;
        color = AppTheme.errorColor;
        break;
      default:
        icon = Icons.event_note;
        color = AppTheme.textSecondary;
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, size: 18, color: color),
    );
  }
}

class _SeverityBadge extends StatelessWidget {
  final AuditSeverity severity;

  const _SeverityBadge({required this.severity});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (severity) {
      case AuditSeverity.info:
        color = AppTheme.primaryColor;
        label = 'INFO';
        break;
      case AuditSeverity.warning:
        color = AppTheme.warningColor;
        label = 'WARN';
        break;
      case AuditSeverity.error:
        color = AppTheme.errorColor;
        label = 'ERROR';
        break;
      case AuditSeverity.critical:
        color = Colors.red.shade900;
        label = 'CRIT';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: AppTheme.backgroundColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: AppTheme.textSecondary),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontSize: 10, color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet();

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late AuditLogFilter _filter;
  AuditAction? _selectedAction;
  AuditSeverity? _selectedSeverity;

  @override
  void initState() {
    super.initState();
    final state = context.read<AuditBloc>().state;
    _filter = state.filter;
    _selectedAction = _filter.action;
    _selectedSeverity = _filter.severity;
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) => SingleChildScrollView(
        controller: scrollController,
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Filter Logs',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                TextButton(
                  onPressed: _clearFilters,
                  child: const Text('Clear All'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Text(
              'Action Type',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: AuditAction.values.take(12).map((action) {
                return FilterChip(
                  label: Text(_getActionLabel(action)),
                  selected: _selectedAction == action,
                  onSelected: (selected) {
                    setState(() {
                      _selectedAction = selected ? action : null;
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            Text(
              'Severity',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: AuditSeverity.values.map((severity) {
                return FilterChip(
                  label: Text(_getSeverityLabel(severity)),
                  selected: _selectedSeverity == severity,
                  onSelected: (selected) {
                    setState(() {
                      _selectedSeverity = selected ? severity : null;
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _applyFilters,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('Apply Filters'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getActionLabel(AuditAction action) {
    return switch (action) {
      AuditAction.login => 'Login',
      AuditAction.logout => 'Logout',
      AuditAction.loginFailed => 'Failed Login',
      AuditAction.secretCreated => 'Secret Created',
      AuditAction.secretUpdated => 'Secret Updated',
      AuditAction.secretDeleted => 'Secret Deleted',
      AuditAction.secretViewed => 'Secret Viewed',
      AuditAction.apiKeyCreated => 'API Key Created',
      AuditAction.apiKeyRevoked => 'API Key Revoked',
      AuditAction.sessionCreated => 'Session Created',
      AuditAction.sessionRevoked => 'Session Revoked',
      AuditAction.deviceAdded => 'Device Added',
      AuditAction.deviceRemoved => 'Device Removed',
      _ => action.name,
    };
  }

  String _getSeverityLabel(AuditSeverity severity) {
    return switch (severity) {
      AuditSeverity.info => 'Info',
      AuditSeverity.warning => 'Warning',
      AuditSeverity.error => 'Error',
      AuditSeverity.critical => 'Critical',
    };
  }

  void _clearFilters() {
    setState(() {
      _selectedAction = null;
      _selectedSeverity = null;
    });
  }

  void _applyFilters() {
    final newFilter = AuditLogFilter(
      action: _selectedAction,
      severity: _selectedSeverity,
      limit: 50,
      offset: 0,
    );
    context.read<AuditBloc>().add(AuditFilterChanged(newFilter));
    Navigator.pop(context);
  }
}

class _LogDetailsSheet extends StatelessWidget {
  final AuditLog log;

  const _LogDetailsSheet({required this.log});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) => SingleChildScrollView(
        controller: scrollController,
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.dividerColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                _ActionIcon(action: log.action),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        log.actionDisplayName,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      Text(
                        log.relativeTime,
                        style: TextStyle(color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
                _SeverityBadge(severity: log.severity),
              ],
            ),
            const SizedBox(height: 24),
            _DetailSection(
              title: 'Event Details',
              items: [
                _DetailItem(label: 'Timestamp', value: log.timestamp.toIso8601String()),
                if (log.actorName != null)
                  _DetailItem(label: 'Actor', value: log.actorName!),
                if (log.actorEmail != null)
                  _DetailItem(label: 'Email', value: log.actorEmail!),
                if (log.actorType != null)
                  _DetailItem(label: 'Actor Type', value: log.actorType!),
                if (log.resourceType != null)
                  _DetailItem(label: 'Resource Type', value: log.resourceType!),
                if (log.resourceName != null)
                  _DetailItem(label: 'Resource', value: log.resourceName!),
                if (log.ipAddress != null)
                  _DetailItem(label: 'IP Address', value: log.ipAddress!),
                if (log.location != null)
                  _DetailItem(label: 'Location', value: log.location!),
                if (log.userAgent != null)
                  _DetailItem(label: 'User Agent', value: log.userAgent!),
              ],
            ),
            if (log.metadata != null && log.metadata!.isNotEmpty) ...[
              const SizedBox(height: 16),
              _DetailSection(
                title: 'Metadata',
                items: log.metadata!.entries
                    .map((e) => _DetailItem(label: e.key, value: e.value.toString()))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailSection extends StatelessWidget {
  final String title;
  final List<_DetailItem> items;

  const _DetailSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            color: AppTheme.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 12,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppTheme.backgroundColor,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: items
                .map((item) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 100,
                            child: Text(
                              item.label,
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          Expanded(
                            child: Text(
                              item.value,
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ))
                .toList(),
          ),
        ),
      ],
    );
  }
}

class _DetailItem {
  final String label;
  final String value;

  const _DetailItem({required this.label, required this.value});
}

class _EmptyAuditView extends StatelessWidget {
  final VoidCallback onClearFilters;

  const _EmptyAuditView({required this.onClearFilters});

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
                Icons.history,
                size: 64,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Audit Logs',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Activity will appear here as actions are performed.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuditLogsSkeleton extends StatelessWidget {
  const _AuditLogsSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 10,
      itemBuilder: (context, index) {
        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 40,
                child: Column(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: AppTheme.dividerColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Expanded(
                      child: Container(
                        width: 2,
                        color: AppTheme.dividerColor,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.cardColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          SkeletonBox(width: 36, height: 36),
                          SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                SkeletonBox(width: 150, height: 14),
                                SizedBox(height: 4),
                                SkeletonBox(width: 80, height: 10),
                              ],
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 8),
                      SkeletonBox(width: double.infinity, height: 10),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}