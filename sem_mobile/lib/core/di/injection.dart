import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';
import 'package:hydrated_bloc/hydrated_bloc.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../network/api_client.dart';
import '../security/security_service.dart';
import '../logging/app_logger.dart';
import '../../features/auth/data/datasources/auth_local_datasource.dart';
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/environments/data/datasources/environment_remote_datasource.dart';
import '../../features/environments/data/repositories/environment_repository_impl.dart';
import '../../features/environments/domain/repositories/environment_repository.dart';
import '../../features/environments/presentation/bloc/environment_bloc.dart';
import '../../features/secrets/data/datasources/secrets_remote_datasource.dart';
import '../../features/secrets/data/repositories/secrets_repository_impl.dart';
import '../../features/secrets/domain/repositories/secrets_repository.dart';
import '../../features/secrets/presentation/bloc/secrets_bloc.dart';

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