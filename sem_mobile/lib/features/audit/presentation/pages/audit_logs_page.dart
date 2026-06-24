import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sem_mobile/core/di/injection.dart';
import 'package:sem_mobile/core/theme/app_colors.dart';
import 'package:sem_mobile/core/theme/app_dimensions.dart';
import 'package:sem_mobile/core/theme/app_typography.dart';
import 'package:sem_mobile/features/audit/domain/entities/audit_log.dart';
import 'package:sem_mobile/features/audit/domain/repositories/audit_repository.dart';
import 'package:sem_mobile/features/audit/presentation/bloc/audit_bloc.dart';
import 'package:sem_mobile/features/audit/presentation/bloc/audit_event.dart';
import 'package:sem_mobile/features/audit/presentation/bloc/audit_state.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_card.dart';
import 'package:sem_mobile/shared/presentation/widgets/app_button.dart';
import 'package:sem_mobile/shared/presentation/widgets/empty_state.dart';
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
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Audit Logs',
          style: AppTypography.titleLarge.copyWith(color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.background,
        actions: [
          IconButton(
            icon: Icon(Icons.filter_list, color: AppColors.textSecondary, size: AppSpacing.iconSize),
            onPressed: () => _showFilterSheet(context),
          ),
          IconButton(
            icon: Icon(Icons.download, color: AppColors.textSecondary, size: AppSpacing.iconSize),
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
                        padding: const EdgeInsets.all(AppSpacing.md),
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
                            padding: EdgeInsets.all(AppSpacing.md),
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        ),
                      if (state.hasReachedMax)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Center(
                              child: Text(
                                'No more logs',
                                style: AppTypography.bodySmall.copyWith(color: AppColors.textTertiary),
                              ),
                            ),
                          ),
                        ),
                      const SliverPadding(padding: EdgeInsets.only(bottom: AppSpacing.xxl)),
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
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.sheet)),
      ),
      builder: (sheetContext) => BlocProvider.value(
        value: context.read<AuditBloc>(),
        child: const _FilterSheet(),
      ),
    );
  }

  void _showExportDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.sheet)),
      ),
      builder: (sheetContext) => BlocProvider.value(
        value: context.read<AuditBloc>(),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text(
                'Export Audit Logs',
                style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
              ),
            ),
            ListTile(
              leading: Icon(Icons.description, color: AppColors.textSecondary),
              title: Text('CSV', style: AppTypography.bodyMedium.copyWith(color: AppColors.textPrimary)),
              onTap: () {
                Navigator.pop(sheetContext);
                context.read<AuditBloc>().add(const AuditExportRequested(format: 'csv'));
              },
            ),
            ListTile(
              leading: Icon(Icons.code, color: AppColors.textSecondary),
              title: Text('JSON', style: AppTypography.bodyMedium.copyWith(color: AppColors.textPrimary)),
              onTap: () {
                Navigator.pop(sheetContext);
                context.read<AuditBloc>().add(const AuditExportRequested(format: 'json'));
              },
            ),
            SizedBox(height: MediaQuery.of(sheetContext).padding.bottom + AppSpacing.md),
          ],
        ),
      ),
    );
  }

  void _showLogDetails(BuildContext context, AuditLog log) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.sheet)),
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
      padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.sm),
      color: AppColors.background,
      child: TextField(
        controller: controller,
        decoration: InputDecoration(
          hintText: 'Search audit logs...',
          hintStyle: AppTypography.bodyMedium.copyWith(color: AppColors.textTertiary),
          prefixIcon: Icon(Icons.search, color: AppColors.textTertiary, size: AppSpacing.iconSizeSm),
          suffixIcon: controller.text.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.clear, color: AppColors.textTertiary, size: AppSpacing.iconSizeSm),
                  onPressed: () {
                    controller.clear();
                    context.read<AuditBloc>().add(const AuditSearchRequested(''));
                  },
                )
              : null,
          filled: true,
          fillColor: AppColors.surface,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
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
          const SizedBox(width: AppSpacing.sm),
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
      AuditSeverity.info => AppColors.accent,
      AuditSeverity.warning => AppColors.warning,
      AuditSeverity.error => AppColors.error,
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
      child: AppCard(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        isHighlighted: log.isSuspicious,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (log.isSuspicious)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xxs),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.1),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.card)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning, size: 14, color: AppColors.warning),
                    const SizedBox(width: AppSpacing.xxs),
                    Text(
                      'Suspicious Activity Detected',
                      style: AppTypography.labelSmall.copyWith(
                        color: AppColors.warning,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _ActionIcon(action: log.action),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              log.actionDisplayName,
                              style: AppTypography.titleSmall.copyWith(
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              log.relativeTime,
                              style: AppTypography.bodySmall.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      _SeverityBadge(severity: log.severity),
                    ],
                  ),
                  if (log.actorName != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Icon(Icons.person_outline, size: 12, color: AppColors.textTertiary),
                        const SizedBox(width: 4),
                        Text(
                          log.actorName!,
                          style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                        ),
                        if (log.actorEmail != null) ...[
                          Text(
                            ' (${log.actorEmail})',
                            style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                          ),
                        ],
                      ],
                    ),
                  ],
                  if (log.resourceName != null) ...[
                    const SizedBox(height: AppSpacing.xxs),
                    Row(
                      children: [
                        Icon(Icons.folder_outlined, size: 12, color: AppColors.textTertiary),
                        const SizedBox(width: 4),
                        Text(
                          '${log.resourceType ?? 'Resource'}: ${log.resourceName}',
                          style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      _InfoChip(
                        icon: Icons.access_time,
                        label: log.timestamp.toString().substring(0, 16),
                      ),
                      if (log.ipAddress != null) ...[
                        const SizedBox(width: AppSpacing.xs),
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
        color = AppColors.accent;
        break;
      case AuditAction.loginFailed:
        icon = Icons.login;
        color = AppColors.error;
        break;
      case AuditAction.secretCreated:
      case AuditAction.secretUpdated:
      case AuditAction.secretDeleted:
        icon = Icons.lock_outline;
        color = AppColors.accent;
        break;
      case AuditAction.secretViewed:
        icon = Icons.visibility;
        color = AppColors.accent;
        break;
      case AuditAction.apiKeyCreated:
      case AuditAction.apiKeyRevoked:
        icon = Icons.key;
        color = AppColors.warning;
        break;
      case AuditAction.sessionCreated:
      case AuditAction.sessionRevoked:
        icon = Icons.devices;
        color = AppColors.accent;
        break;
      case AuditAction.deviceAdded:
      case AuditAction.deviceRemoved:
        icon = Icons.phone_android;
        color = AppColors.accent;
        break;
      case AuditAction.securityAlert:
      case AuditAction.suspiciousActivity:
        icon = Icons.warning;
        color = AppColors.error;
        break;
      default:
        icon = Icons.event_note;
        color = AppColors.textSecondary;
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.sm),
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
        color = AppColors.accent;
        label = 'INFO';
        break;
      case AuditSeverity.warning:
        color = AppColors.warning;
        label = 'WARN';
        break;
      case AuditSeverity.error:
        color = AppColors.error;
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
        borderRadius: BorderRadius.circular(AppRadius.xs),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: AppTypography.labelSmall.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
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
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(AppRadius.xs),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: AppColors.textTertiary),
          const SizedBox(width: 4),
          Text(
            label,
            style: AppTypography.labelSmall.copyWith(color: AppColors.textTertiary),
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
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Filter Logs',
                  style: AppTypography.titleLarge.copyWith(color: AppColors.textPrimary),
                ),
                TextButton(
                  onPressed: _clearFilters,
                  child: Text('Clear All', style: AppTypography.labelLarge.copyWith(color: AppColors.accent)),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Action Type',
              style: AppTypography.labelMedium.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.xs),
            Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: AuditAction.values.take(12).map((action) {
                return FilterChip(
                  label: Text(_getActionLabel(action), style: AppTypography.labelSmall.copyWith(color: AppColors.textPrimary)),
                  selected: _selectedAction == action,
                  selectedColor: AppColors.accent.withValues(alpha: 0.2),
                  checkmarkColor: AppColors.accent,
                  onSelected: (selected) {
                    setState(() {
                      _selectedAction = selected ? action : null;
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Severity',
              style: AppTypography.labelMedium.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.xs),
            Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: AuditSeverity.values.map((severity) {
                return FilterChip(
                  label: Text(_getSeverityLabel(severity), style: AppTypography.labelSmall.copyWith(color: AppColors.textPrimary)),
                  selected: _selectedSeverity == severity,
                  selectedColor: _getSeverityChipColor(severity).withValues(alpha: 0.2),
                  checkmarkColor: _getSeverityChipColor(severity),
                  onSelected: (selected) {
                    setState(() {
                      _selectedSeverity = selected ? severity : null;
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.xl),
            SizedBox(
              width: double.infinity,
              child: AppButton(
                label: 'Apply Filters',
                onPressed: _applyFilters,
                isExpanded: true,
              ),
            ),
            SizedBox(height: MediaQuery.of(context).padding.bottom + AppSpacing.md),
          ],
        ),
      ),
    );
  }

  Color _getSeverityChipColor(AuditSeverity severity) {
    return switch (severity) {
      AuditSeverity.info => AppColors.accent,
      AuditSeverity.warning => AppColors.warning,
      AuditSeverity.error => AppColors.error,
      AuditSeverity.critical => Colors.red.shade900,
    };
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
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                _ActionIcon(action: log.action),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        log.actionDisplayName,
                        style: AppTypography.titleMedium.copyWith(color: AppColors.textPrimary),
                      ),
                      Text(
                        log.relativeTime,
                        style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                _SeverityBadge(severity: log.severity),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
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
              const SizedBox(height: AppSpacing.md),
              _DetailSection(
                title: 'Metadata',
                items: log.metadata!.entries
                    .map((e) => _DetailItem(label: e.key, value: e.value.toString()))
                    .toList(),
              ),
            ],
            SizedBox(height: MediaQuery.of(context).padding.bottom + AppSpacing.lg),
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
          style: AppTypography.labelMedium.copyWith(
            color: AppColors.textSecondary,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Container(
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(AppRadius.sm),
          ),
          child: Column(
            children: items
                .map((item) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.sm),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 100,
                            child: Text(
                              item.label,
                              style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                            ),
                          ),
                          Expanded(
                            child: Text(
                              item.value,
                              style: AppTypography.bodySmall.copyWith(color: AppColors.textPrimary),
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
    return EmptyState(
      icon: Icons.history,
      title: 'No Audit Logs',
      description: 'Activity will appear here as actions are performed',
      iconColor: AppColors.accent,
    );
  }
}

class _AuditLogsSkeleton extends StatelessWidget {
  const _AuditLogsSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.md),
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
                        color: AppColors.surface,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Expanded(
                      child: Container(
                        width: 2,
                        color: AppColors.surface,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: AppCard(
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          SkeletonBox(width: 36, height: 36),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                SkeletonBox(width: 150, height: 14),
                                const SizedBox(height: 4),
                                SkeletonBox(width: 80, height: 10),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
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