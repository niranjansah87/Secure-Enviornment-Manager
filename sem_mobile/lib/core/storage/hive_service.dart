import 'package:hive_ce/hive.dart';

/// Hive database configuration
class HiveService {
  static HiveService? _instance;
  late Box<dynamic> _settingsBox;
  late Box<dynamic> _cacheBox;

  bool _initialized = false;

  HiveService._();

  static HiveService get instance {
    _instance ??= HiveService._();
    return _instance!;
  }

  bool get isInitialized => _initialized;

  Future<void> initialize() async {
    if (_initialized) return;

    _settingsBox = await Hive.openBox('settings');
    _cacheBox = await Hive.openBox('cache');

    _initialized = true;
  }

  Box<dynamic> get settingsBox => _settingsBox;
  Box<dynamic> get cacheBox => _cacheBox;

  Future<void> clearAll() async {
    await _settingsBox.clear();
    await _cacheBox.clear();
  }

  Future<void> close() async {
    await Hive.close();
    _initialized = false;
  }
}