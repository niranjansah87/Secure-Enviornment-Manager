/// Application-wide constants
abstract final class AppConstants {
  // App Info
  static const String appName = 'Secure Environment Manager';
  static const String appVersion = '1.0.0';
  static const String appBuildNumber = '1';

  // API Configuration
  static const String baseUrlLocal = 'http://localhost:8070';
  static const String baseUrlStaging = 'https://staging-api.sem.internal';
  static const String baseUrlProduction = 'https://api.sem.internal';

  // Timeouts (milliseconds)
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
  static const int sendTimeout = 30000;

  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';
  static const String settingsKey = 'app_settings';
  static const String themeKey = 'theme_mode';
  static const String lastSyncKey = 'last_sync';

  // Validation
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 128;
  static const int minUsernameLength = 3;
  static const int maxUsernameLength = 64;

  // UI
  static const int maxRetries = 3;
  static const int loadingAnimationDuration = 1500;
  static const int toastDuration = 3000;
  static const int skeletonItemCount = 6;

  // Security
  static const int sessionTimeoutMinutes = 30;
  static const int tokenRefreshThresholdMinutes = 5;
  static const int maxLoginAttempts = 5;
  static const int lockoutDurationMinutes = 15;
}

/// Route names
abstract final class RouteNames {
  static const String splash = '/';
  static const String login = '/login';
  static const String dashboard = '/dashboard';
  static const String environments = '/environments';
  static const String environmentDetails = '/environments/:namespaceId/:environmentId';
  static const String secrets = '/secrets';
  static const String secretDetails = '/secrets/:namespaceId/:environmentId';
  static const String settings = '/settings';
}

/// Route paths
abstract final class RoutePaths {
  static const String splash = '/';
  static const String offline = '/offline';
  static const String login = '/login';
  static const String dashboard = '/dashboard';
  static const String environments = '/environments';
  static const String environmentDetails = '/environments';
  static const String secrets = '/secrets';
  static const String secretDetails = '/secrets';
  static const String settings = '/settings';
}