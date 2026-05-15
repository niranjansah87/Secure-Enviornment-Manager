import 'package:equatable/equatable.dart';
import 'package:sem_mobile/features/api_keys/domain/entities/api_key.dart';
import 'package:sem_mobile/features/api_keys/domain/repositories/api_key_repository.dart';

enum ApiKeyStatus {
  initial,
  loading,
  success,
  failure,
  creating,
  created,
  revoking,
  revoked,
  copying,
  copied,
}

class ApiKeyState extends Equatable {
  final ApiKeyStatus status;
  final List<ApiKey> keys;
  final ApiKey? selectedKey;
  final ApiKey? newlyCreatedKey;
  final String? rawKeyForDisplay;
  final ApiKeyUsageStats? usageStats;
  final String? errorMessage;
  final String? successMessage;
  final bool showCreateForm;

  const ApiKeyState({
    this.status = ApiKeyStatus.initial,
    this.keys = const [],
    this.selectedKey,
    this.newlyCreatedKey,
    this.rawKeyForDisplay,
    this.usageStats,
    this.errorMessage,
    this.successMessage,
    this.showCreateForm = false,
  });

  List<ApiKey> get activeKeys => keys.where((k) => k.isActive && !k.isExpired).toList();
  List<ApiKey> get inactiveKeys => keys.where((k) => !k.isActive || k.isExpired).toList();

  ApiKeyState copyWith({
    ApiKeyStatus? status,
    List<ApiKey>? keys,
    ApiKey? selectedKey,
    bool clearSelectedKey = false,
    ApiKey? newlyCreatedKey,
    bool clearNewlyCreatedKey = false,
    String? rawKeyForDisplay,
    bool clearRawKeyForDisplay = false,
    ApiKeyUsageStats? usageStats,
    bool clearUsageStats = false,
    String? errorMessage,
    bool clearError = false,
    String? successMessage,
    bool clearSuccess = false,
    bool? showCreateForm,
  }) {
    return ApiKeyState(
      status: status ?? this.status,
      keys: keys ?? this.keys,
      selectedKey: clearSelectedKey ? null : (selectedKey ?? this.selectedKey),
      newlyCreatedKey: clearNewlyCreatedKey ? null : (newlyCreatedKey ?? this.newlyCreatedKey),
      rawKeyForDisplay: clearRawKeyForDisplay ? null : (rawKeyForDisplay ?? this.rawKeyForDisplay),
      usageStats: clearUsageStats ? null : (usageStats ?? this.usageStats),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      successMessage: clearSuccess ? null : (successMessage ?? this.successMessage),
      showCreateForm: showCreateForm ?? this.showCreateForm,
    );
  }

  @override
  List<Object?> get props => [
        status,
        keys,
        selectedKey,
        newlyCreatedKey,
        rawKeyForDisplay,
        usageStats,
        errorMessage,
        successMessage,
        showCreateForm,
      ];
}