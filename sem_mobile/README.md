# Secure Environment Manager - Mobile Application

Enterprise-grade secrets management platform mobile application built with Flutter.

## Architecture

The app follows a feature-first Clean Architecture with:

- **Core Layer**: Shared utilities, constants, theme, networking, security, and DI
- **Features Layer**: Feature modules (auth, dashboard, environments, secrets, settings)
- **Shared Layer**: Reusable widgets, states, and domain entities
- **Routing**: go_router for declarative navigation
- **State Management**: flutter_bloc with HydratedBloc for persistence
- **Dependency Injection**: get_it with injectable

## Project Structure

```
lib/
├── core/
│   ├── constants/       # App constants, routes
│   ├── di/             # Dependency injection setup
│   ├── errors/         # Failure classes, Result type
│   ├── environment/    # Environment configurations
│   ├── extensions/     # Dart extensions
│   ├── logging/        # AppLogger with Talker
│   ├── network/        # Dio client, interceptors
│   ├── security/       # SecurityService, biometrics
│   ├── storage/        # HiveService
│   ├── theme/          # Colors, typography, dimensions, theme
│   └── utils/          # Connectivity service
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── environments/
│   ├── secrets/
│   └── settings/
├── routes/             # go_router configuration
├── shared/
│   ├── domain/entities/
│   └── presentation/
│       ├── states/
│       └── widgets/
├── app.dart
└── main.dart
```

## Getting Started

1. Install dependencies:
```bash
flutter pub get
```

2. Run the app:
```bash
flutter run
```

## Features

- **Security-First Design**: Biometric authentication, secure token storage, encrypted Hive storage
- **Enterprise UI**: Dark theme inspired by Linear, GitHub, Vercel
- **Real-time Ready**: WebSocket scaffolding for future real-time features
- **Offline Support**: Hive-based local persistence
- **Production Ready**: Sentry crash reporting, structured logging

## Dependencies

### State Management
- flutter_bloc: BLoC pattern implementation
- hydrated_bloc: Persistent state management

### Networking
- dio: HTTP client
- pretty_dio_logger: Request/response logging
- talker_dio_logger: Advanced logging

### Dependency Injection
- get_it: Service locator
- injectable: Code generation for DI

### Storage
- flutter_secure_storage: Encrypted key-value storage
- hive_ce: NoSQL database

### UI
- google_fonts: Inter & JetBrains Mono fonts
- flutter_animate: Declarative animations
- shimmer: Loading skeletons
- lottie: Lottie animations

### Security
- local_auth: Biometric authentication
- flutter_secure_storage: Secure credential storage

### Observability
- talker: Structured logging
- sentry_flutter: Crash reporting

## Environment Configuration

- **Local**: http://localhost:8070
- **Staging**: https://staging-api.sem.internal
- **Production**: https://api.sem.internal

## Security Features

- Secure token storage with Flutter Secure Storage
- Biometric authentication scaffolding (Face ID, Touch ID, Fingerprint)
- SSL pinning ready
- Screenshot prevention scaffolding
- Clipboard protection utilities
- Secure session timeout

## Next Implementation Steps

1. **Environments Feature**: Full CRUD for environments
2. **Secrets Feature**: Secrets list, create, view, edit, delete
3. **Dashboard**: Security overview, recent activity, quick actions
4. **Audit Feature**: Audit log viewing and filtering
5. **Real-time Updates**: WebSocket integration for live updates
6. **Push Notifications**: FCM setup for alerts
7. **Widget**: Home screen widget for quick access