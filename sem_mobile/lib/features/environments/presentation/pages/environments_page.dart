import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_dimensions.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/presentation/widgets/loading_skeleton.dart';
import '../../../../shared/presentation/widgets/app_error_widget.dart';
import '../../domain/entities/environment.dart';
import '../bloc/environment_bloc.dart';
import '../../../../routes/app_router.dart';

/// Environments page with full UI
class EnvironmentsPage extends StatelessWidget {
  const EnvironmentsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<EnvironmentBloc>()
        ..add(const EnvironmentsLoadRequested()),
      child: const _EnvironmentsView(),
    );
  }
}

class _EnvironmentsView extends StatefulWidget {
  const _EnvironmentsView();

  @override
  State<_EnvironmentsView> createState() => _EnvironmentsViewState();
}

class _EnvironmentsViewState extends State<_EnvironmentsView> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: BlocBuilder<EnvironmentBloc, EnvironmentState>(
          builder: (context, state) {
            return CustomScrollView(
              slivers: [
                _buildAppBar(context, state),
                _buildSearchBar(context),
                _buildContent(context, state),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context, EnvironmentState state) {
    return SliverAppBar(
      backgroundColor: AppColors.background,
      floating: true,
      title: Text(
        'Environments',
        style: AppTypography.headlineMedium.copyWith(
          color: AppColors.textPrimary,
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh, color: AppColors.textSecondary),
          onPressed: () {
            context.read<EnvironmentBloc>().add(const EnvironmentRefreshRequested());
          },
        ),
      ],
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Search environments...',
            hintStyle: AppTypography.bodyMedium.copyWith(
              color: AppColors.textTertiary,
            ),
            prefixIcon: const Icon(Icons.search, color: AppColors.textTertiary),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
          ),
          onChanged: (query) {
            context.read<EnvironmentBloc>().add(EnvironmentSearchRequested(query));
          },
        ),
      ).animate().fadeIn(duration: const Duration(milliseconds: 300)),
    );
  }

  Widget _buildContent(BuildContext context, EnvironmentState state) {
    if (state.status == EnvironmentStatus.loading) {
      return SliverFillRemaining(
        child: _buildLoadingState(),
      );
    }

    if (state.status == EnvironmentStatus.error) {
      return SliverFillRemaining(
        child: AppErrorWidget(
          message: state.failure?.message ?? 'Failed to load environments',
          onRetry: () {
            context.read<EnvironmentBloc>().add(const EnvironmentsLoadRequested());
          },
        ),
      );
    }

    return SliverList(
      delegate: SliverChildListDelegate([
        if (state.favoriteEnvironments.isNotEmpty) ...[
          _buildSectionHeader('Favorites', Icons.star, AppColors.warning),
          _buildEnvironmentsList(state.favoriteEnvironments, isFavorites: true),
          const SizedBox(height: AppSpacing.lg),
        ],
        if (state.recentEnvironments.isNotEmpty) ...[
          _buildSectionHeader('Recent', Icons.history, AppColors.info),
          _buildEnvironmentsList(state.recentEnvironments),
          const SizedBox(height: AppSpacing.lg),
        ],
        _buildSectionHeader('All Environments', Icons.folder, AppColors.accent),
        if (state.namespaces.isNotEmpty) ...[
          _buildNamespaceTabs(context, state),
          const SizedBox(height: AppSpacing.sm),
        ],
        if (state.filteredEnvironments.isEmpty)
          _buildEmptyState()
        else
          _buildEnvironmentsList(state.filteredEnvironments),
        const SizedBox(height: AppSpacing.xxl),
      ]),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: AppSpacing.sm),
          Text(
            title,
            style: AppTypography.titleSmall.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    ).animate().fadeIn();
  }

  Widget _buildNamespaceTabs(BuildContext context, EnvironmentState state) {
    return SizedBox(
      height: 40,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        itemCount: state.namespaces.length,
        itemBuilder: (context, index) {
          final ns = state.namespaces[index];
          final isSelected = state.selectedNamespace?.id == ns.id;
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.xs),
            child: FilterChip(
              label: Text(ns.name),
              selected: isSelected,
              onSelected: (_) {
                context.read<EnvironmentBloc>().add(
                  EnvironmentsLoadRequested(namespaceId: ns.id),
                );
              },
              backgroundColor: AppColors.surface,
              selectedColor: AppColors.accent.withValues(alpha: 0.2),
              labelStyle: AppTypography.bodySmall.copyWith(
                color: isSelected ? AppColors.accent : AppColors.textSecondary,
              ),
              side: BorderSide.none,
            ),
          );
        },
      ),
    );
  }

  Widget _buildEnvironmentsList(List<Environment> environments, {bool isFavorites = false}) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      itemCount: environments.length,
      itemBuilder: (context, index) {
        final env = environments[index];
        return _EnvironmentCard(
          environment: env,
          isFavorite: isFavorites || env.isFavorite,
          index: index,
        );
      },
    );
  }

  Widget _buildLoadingState() {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          LoadingSkeleton(height: 80, borderRadius: AppRadius.md),
          const SizedBox(height: AppSpacing.sm),
          LoadingSkeleton(height: 80, borderRadius: AppRadius.md),
          const SizedBox(height: AppSpacing.sm),
          LoadingSkeleton(height: 80, borderRadius: AppRadius.md),
          LoadingSkeleton(height: 80, borderRadius: AppRadius.md),
          const SizedBox(height: AppSpacing.sm),
          LoadingSkeleton(height: 80, borderRadius: AppRadius.md),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.cloud_outlined,
                size: 48,
                color: AppColors.textTertiary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'No environments yet',
              style: AppTypography.titleMedium.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Your environments will appear here',
              style: AppTypography.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EnvironmentCard extends StatelessWidget {
  final Environment environment;
  final bool isFavorite;
  final int index;

  const _EnvironmentCard({
    required this.environment,
    required this.isFavorite,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          context.read<EnvironmentBloc>().add(EnvironmentSelected(environment));
          context.goToSecrets(
            namespaceId: environment.namespaceId,
            environmentId: environment.id,
          );
        },
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getEnvColor(environment.color).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Icon(
                  _getEnvIcon(environment.icon),
                  color: _getEnvColor(environment.color),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      environment.name,
                      style: AppTypography.titleSmall.copyWith(
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (environment.description != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        environment.description!,
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.key,
                          size: 14,
                          color: AppColors.textTertiary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${environment.secretCount} secrets',
                          style: AppTypography.labelSmall.copyWith(
                            color: AppColors.textTertiary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  isFavorite ? Icons.star : Icons.star_border,
                  color: isFavorite ? AppColors.warning : AppColors.textTertiary,
                ),
                onPressed: () {
                  HapticFeedback.mediumImpact();
                  context.read<EnvironmentBloc>().add(
                    EnvironmentFavoriteToggled(
                      namespaceId: environment.namespaceId,
                      environmentId: environment.id,
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(
      delay: Duration(milliseconds: 50 * index),
      duration: const Duration(milliseconds: 300),
    ).slideX(
      begin: 0.1,
      end: 0,
      delay: Duration(milliseconds: 50 * index),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  Color _getEnvColor(String? color) {
    switch (color) {
      case 'red':
        return AppColors.error;
      case 'green':
        return Colors.green;
      case 'blue':
        return Colors.blue;
      case 'orange':
        return Colors.orange;
      case 'purple':
        return Colors.purple;
      default:
        return AppColors.accent;
    }
  }

  IconData _getEnvIcon(String icon) {
    switch (icon) {
      case 'server':
        return Icons.dns;
      case 'cloud':
        return Icons.cloud;
      case 'database':
        return Icons.storage;
      case 'lock':
        return Icons.lock;
      default:
        return Icons.key;
    }
  }
}