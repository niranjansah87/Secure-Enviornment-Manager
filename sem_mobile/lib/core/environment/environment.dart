/// Environment types for the application
enum AppEnvironment {
  local,
  staging,
  production,
}

/// Environment configuration
class Environment {
  final String name;
  final String apiBaseUrl;
  final String wsUrl;
  final bool enableLogging;
  final bool enableSentry;
  final bool enableAnalytics;

  const Environment({
    required this.name,
    required this.apiBaseUrl,
    required this.wsUrl,
    this.enableLogging = true,
    this.enableSentry = false,
    this.enableAnalytics = false,
  });
}

/// Environment configurations
abstract final class Environments {
  /// Local development environment
  /// Use for: Running Flutter app with backend on localhost
  /// Backend must be accessible at http://localhost:8070
  static const Environment local = Environment(
    name: 'local',
    apiBaseUrl: 'http://10.0.2.2:8070',  // Android emulator localhost
    wsUrl: 'ws://10.0.2.2:8070/ws',     // Android emulator localhost
    enableLogging: true,
    enableSentry: false,
    enableAnalytics: false,
  );

  /// Local network environment
  /// Use for: Flutter app on physical device connecting to server on same LAN
  /// Replace 192.168.1.x with actual server IP
  static const Environment localNetwork = Environment(
    name: 'local_network',
    apiBaseUrl: 'http://192.168.1.100:8070',  // Server IP on LAN
    wsUrl: 'ws://192.168.1.100:8070/ws',
    enableLogging: true,
    enableSentry: false,
    enableAnalytics: false,
  );

  /// Staging environment
  /// Use for: Testing with staging server
  static const Environment staging = Environment(
    name: 'staging',
    apiBaseUrl: 'https://staging-api.sem.internal',
    wsUrl: 'wss://staging-api.sem.internal/ws',
    enableLogging: true,
    enableSentry: true,
    enableAnalytics: true,
  );

  /// Production environment
  /// Use for: Production deployment with customer-hosted backend
  static const Environment production = Environment(
    name: 'production',
    apiBaseUrl: 'https://api.sem.internal',
    wsUrl: 'wss://api.sem.internal/ws',
    enableLogging: false,
    enableSentry: true,
    enableAnalytics: true,
  );

  /// Self-hosted environment
  /// Use for: Customer's own server deployment
  /// Configure via environment variables at build time
  static Environment selfHosted({
    required String apiBaseUrl,
    String? wsUrl,
    bool enableLogging = false,
    bool enableSentry = false,
    bool enableAnalytics = false,
  }) {
    return Environment(
      name: 'self_hosted',
      apiBaseUrl: apiBaseUrl,
      wsUrl: wsUrl ?? '$apiBaseUrl/ws',
      enableLogging: enableLogging,
      enableSentry: enableSentry,
      enableAnalytics: enableAnalytics,
    );
  }

  /// Get environment from string identifier
  static Environment fromString(String? value) {
    switch (value) {
      case 'local':
        return local;
      case 'local_network':
        return localNetwork;
      case 'staging':
        return staging;
      case 'production':
        return production;
      default:
        return local;
    }
  }
}

/// Compile-time environment marker
abstract class AppEnvironmentConfig {
  /// Current active environment
  /// Set via flutter build --dart-define=ENVIRONMENT=production
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'local',
  );

  /// Get current environment
  static Environment get current => Environments.fromString(environment);

  /// Check if running in production
  static bool get isProduction => environment == 'production';

  /// Check if running in development
  static bool get isDevelopment => environment == 'local' || environment == 'local_network';
}