import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sem_mobile/app.dart';
import 'package:sem_mobile/core/di/injection.dart';
import 'package:sem_mobile/core/environment/env_config.dart';
import 'package:sem_mobile/core/theme/app_theme.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/core/storage/hive_service.dart';
import 'package:sem_mobile/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:sem_mobile/routes/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: Color(0xFF0F172A),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  // Initialize environment configuration first
  await EnvConfig.getInstance();

  // Log app start with env info
  final env = EnvConfig.instance;
  AppLogger.instance.info('App starting in ${env.appEnv} mode');

  // Initialize dependencies
  await setupDependencies();

  // Initialize Hive storage
  await HiveService.instance.initialize();

  // Validate environment
  final errors = env.validate();
  if (errors.isNotEmpty) {
    AppLogger.instance.error('Environment validation failed: $errors');
  }

  runApp(const App());
}