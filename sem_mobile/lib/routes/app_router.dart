import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sem_mobile/core/constants/app_constants.dart';
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
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: RoutePaths.offline,
        name: 'offline',
        builder: (context, state) => const OfflinePage(),
      ),
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) => const DashboardPage(),
      ),
      GoRoute(
        path: RoutePaths.environments,
        name: RouteNames.environments,
        builder: (context, state) => const EnvironmentsPage(),
      ),
      GoRoute(
        path: '/secrets/:namespaceId/:environmentId',
        name: 'secrets_detail',
        builder: (context, state) {
          final namespaceId = state.pathParameters['namespaceId']!;
          final environmentId = state.pathParameters['environmentId']!;
          return SecretsPage(
            namespaceId: namespaceId,
            environmentId: environmentId,
          );
        },
      ),
      GoRoute(
        path: RoutePaths.settings,
        name: RouteNames.settings,
        builder: (context, state) => const SettingsPage(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Page not found: ${state.uri}'),
      ),
    ),
  );
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