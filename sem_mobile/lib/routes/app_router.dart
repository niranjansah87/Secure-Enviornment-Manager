import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sem_mobile/core/constants/app_constants.dart';
import 'package:sem_mobile/core/theme/app_dimensions.dart';
import 'package:sem_mobile/features/auth/presentation/pages/splash_page.dart';
import 'package:sem_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:sem_mobile/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:sem_mobile/features/environments/presentation/pages/environments_page.dart';
import 'package:sem_mobile/features/secrets/presentation/pages/secrets_page.dart';
import 'package:sem_mobile/features/settings/presentation/pages/settings_page.dart';
import 'package:sem_mobile/features/connectivity/presentation/pages/offline_page.dart';
import 'package:sem_mobile/core/utils/connectivity_service.dart';

/// Application router configuration
class AppRouter {
  AppRouter._();

  static final GoRouter router = GoRouter(
    initialLocation: RoutePaths.splash,
    debugLogDiagnostics: true,
    redirect: (context, state) async {
      // Check connectivity for non-splash pages
      if (state.uri.path != RoutePaths.splash) {
        final isConnected = await ConnectivityService.instance.isConnected;
        if (!isConnected) {
          return RoutePaths.offline;
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: RoutePaths.splash,
        name: RouteNames.splash,
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const SplashPage(),
          transitionsBuilder: _fadeTransition,
          transitionDuration: const Duration(milliseconds: AppDurations.slow),
        ),
      ),
      GoRoute(
        path: RoutePaths.offline,
        name: 'offline',
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const OfflinePage(),
          transitionsBuilder: _fadeTransition,
          transitionDuration: const Duration(milliseconds: AppDurations.fast),
        ),
      ),
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const LoginPage(),
          transitionsBuilder: _fadeTransition,
          transitionDuration: const Duration(milliseconds: AppDurations.slow),
        ),
      ),
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const DashboardPage(),
          transitionsBuilder: _fadeTransition,
          transitionDuration: const Duration(milliseconds: AppDurations.pageTransition),
        ),
      ),
      GoRoute(
        path: RoutePaths.environments,
        name: RouteNames.environments,
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const EnvironmentsPage(),
          transitionsBuilder: _fadeTransition,
          transitionDuration: const Duration(milliseconds: AppDurations.pageTransition),
        ),
      ),
      GoRoute(
        path: '/secrets/:namespaceId/:environmentId',
        name: 'secrets_detail',
        pageBuilder: (context, state) {
          final namespaceId = state.pathParameters['namespaceId']!;
          final environmentId = state.pathParameters['environmentId']!;
          return CustomTransitionPage(
            key: state.pageKey,
            child: SecretsPage(
              namespaceId: namespaceId,
              environmentId: environmentId,
            ),
            transitionsBuilder: _slideTransition,
            transitionDuration: const Duration(milliseconds: AppDurations.pageTransition),
          );
        },
      ),
      GoRoute(
        path: RoutePaths.settings,
        name: RouteNames.settings,
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const SettingsPage(),
          transitionsBuilder: _slideTransition,
          transitionDuration: const Duration(milliseconds: AppDurations.pageTransition),
        ),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Page not found: ${state.uri}'),
      ),
    ),
  );

  static Widget _fadeTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return FadeTransition(
      opacity: CurveTween(curve: Curves.easeInOut).animate(animation),
      child: child,
    );
  }

  static Widget _slideTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(1.0, 0.0),
        end: Offset.zero,
      ).chain(CurveTween(curve: Curves.easeInOut)).animate(animation),
      child: FadeTransition(
        opacity: animation,
        child: child,
      ),
    );
  }
}

/// Navigation helper extension
extension NavigationExtension on BuildContext {
  void goToSplash() => go(RoutePaths.splash);
  void goToLogin() => go(RoutePaths.login);
  void goToDashboard() => go(RoutePaths.dashboard);
  void goToEnvironments() => go(RoutePaths.environments);
  void goToSecrets({
    required String namespaceId,
    required String environmentId,
  }) =>
      go('/secrets/$namespaceId/$environmentId');
  void goToSettings() => go(RoutePaths.settings);
  void goToOffline() => go(RoutePaths.offline);
}