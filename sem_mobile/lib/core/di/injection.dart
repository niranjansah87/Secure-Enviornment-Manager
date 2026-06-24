import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';

import '../network/api_client.dart';
import '../security/security_service.dart';
import '../logging/app_logger.dart';
import '../../features/auth/data/datasources/auth_local_datasource.dart';
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/audit/data/datasources/audit_remote_datasource.dart';
import '../../features/audit/data/repositories/audit_repository_impl.dart';
import '../../features/audit/domain/repositories/audit_repository.dart';
import '../../features/audit/presentation/bloc/audit_bloc.dart';
import '../../features/api_keys/data/datasources/api_key_remote_datasource.dart';
import '../../features/api_keys/data/repositories/api_key_repository_impl.dart';
import '../../features/api_keys/domain/repositories/api_key_repository.dart';
import '../../features/api_keys/presentation/bloc/api_key_bloc.dart';
import '../../features/environments/data/datasources/environment_remote_datasource.dart';
import '../../features/environments/data/repositories/environment_repository_impl.dart';
import '../../features/environments/domain/repositories/environment_repository.dart';
import '../../features/environments/presentation/bloc/environment_bloc.dart';
import '../../features/secrets/data/datasources/secrets_remote_datasource.dart';
import '../../features/secrets/data/repositories/secrets_repository_impl.dart';
import '../../features/secrets/domain/repositories/secrets_repository.dart';
import '../../features/secrets/presentation/bloc/secrets_bloc.dart';
import '../../features/sessions/data/datasources/session_remote_datasource.dart';
import '../../features/sessions/data/repositories/session_repository_impl.dart';
import '../../features/sessions/domain/repositories/session_repository.dart';
import '../../features/sessions/presentation/bloc/session_bloc.dart';

final getIt = GetIt.instance;

Future<void> setupDependencies() async {
  // External
  getIt.registerLazySingleton<FlutterSecureStorage>(
    () => const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    ),
  );

  // Core Services
  getIt.registerLazySingleton<SecurityService>(() => SecurityService.instance);
  getIt.registerLazySingleton<ApiClient>(() => ApiClient.instance);

  // Logging
  getIt.registerLazySingleton<AppLogger>(() => AppLogger.instance);

  // Auth Feature
  _setupAuthFeature();
  _setupEnvironmentsFeature();
  _setupSecretsFeature();
  _setupAuditFeature();
  _setupApiKeysFeature();
  _setupSessionsFeature();
}

void _setupAuthFeature() {
  // Data Sources
  getIt.registerLazySingleton<AuthLocalDataSource>(
    () => AuthLocalDataSource(getIt<FlutterSecureStorage>()),
  );
  getIt.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSource(ApiClient.instance.dio),
  );

  // Repository
  getIt.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      localDataSource: getIt<AuthLocalDataSource>(),
      remoteDataSource: getIt<AuthRemoteDataSource>(),
      securityService: getIt<SecurityService>(),
    ),
  );

  // BLoC
  getIt.registerFactory<AuthBloc>(
    () => AuthBloc(
      authRepository: getIt<AuthRepository>(),
      securityService: getIt<SecurityService>(),
    ),
  );
}

void _setupEnvironmentsFeature() {
  // Data Sources
  getIt.registerLazySingleton<EnvironmentRemoteDataSource>(
    () => EnvironmentRemoteDataSource(ApiClient.instance.dio),
  );
  getIt.registerLazySingleton<EnvironmentLocalDataSource>(
    () => EnvironmentLocalDataSource(),
  );

  // Repository
  getIt.registerLazySingleton<EnvironmentRepository>(
    () => EnvironmentRepositoryImpl(
      remoteDataSource: getIt<EnvironmentRemoteDataSource>(),
      localDataSource: getIt<EnvironmentLocalDataSource>(),
    ),
  );

  // BLoC
  getIt.registerFactory<EnvironmentBloc>(
    () => EnvironmentBloc(
      repository: getIt<EnvironmentRepository>(),
    ),
  );
}

void _setupSecretsFeature() {
  // Data Sources
  getIt.registerLazySingleton<SecretsRemoteDataSource>(
    () => SecretsRemoteDataSource(ApiClient.instance.dio),
  );

  // Repository
  getIt.registerLazySingleton<SecretsRepository>(
    () => SecretsRepositoryImpl(
      remoteDataSource: getIt<SecretsRemoteDataSource>(),
      securityService: getIt<SecurityService>(),
    ),
  );

  // BLoC
  getIt.registerFactory<SecretsBloc>(
    () => SecretsBloc(
      repository: getIt<SecretsRepository>(),
    ),
  );
}

void _setupAuditFeature() {
  // Data Sources
  getIt.registerLazySingleton<AuditRemoteDataSource>(
    () => AuditRemoteDataSource(ApiClient.instance.dio),
  );

  // Repository
  getIt.registerLazySingleton<AuditRepository>(
    () => AuditRepositoryImpl(
      getIt<AuditRemoteDataSource>(),
    ),
  );

  // BLoC
  getIt.registerFactory<AuditBloc>(
    () => AuditBloc(
      repository: getIt<AuditRepository>(),
    ),
  );
}

void _setupApiKeysFeature() {
  // Data Sources
  getIt.registerLazySingleton<ApiKeyRemoteDataSource>(
    () => ApiKeyRemoteDataSource(ApiClient.instance.dio),
  );

  // Repository
  getIt.registerLazySingleton<ApiKeyRepository>(
    () => ApiKeyRepositoryImpl(
      getIt<ApiKeyRemoteDataSource>(),
    ),
  );

  // BLoC
  getIt.registerFactory<ApiKeyBloc>(
    () => ApiKeyBloc(
      repository: getIt<ApiKeyRepository>(),
    ),
  );
}

void _setupSessionsFeature() {
  // Data Sources
  getIt.registerLazySingleton<SessionRemoteDataSource>(
    () => SessionRemoteDataSource(ApiClient.instance.dio),
  );

  // Repository
  getIt.registerLazySingleton<SessionRepository>(
    () => SessionRepositoryImpl(
      getIt<SessionRemoteDataSource>(),
    ),
  );

  // BLoC
  getIt.registerFactory<SessionBloc>(
    () => SessionBloc(
      repository: getIt<SessionRepository>(),
    ),
  );
}