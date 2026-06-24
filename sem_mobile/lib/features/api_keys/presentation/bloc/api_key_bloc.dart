import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sem_mobile/core/errors/result.dart';
import 'package:sem_mobile/core/logging/app_logger.dart';
import 'package:sem_mobile/features/api_keys/domain/entities/api_key.dart';
import 'package:sem_mobile/features/api_keys/domain/repositories/api_key_repository.dart';
import 'package:sem_mobile/features/api_keys/presentation/bloc/api_key_event.dart';
import 'package:sem_mobile/features/api_keys/presentation/bloc/api_key_state.dart';

class ApiKeyBloc extends Bloc<ApiKeyEvent, ApiKeyState> {
  final ApiKeyRepository _repository;
  final AppLogger _logger = AppLogger.instance;

  ApiKeyBloc({required ApiKeyRepository repository})
      : _repository = repository,
        super(const ApiKeyState()) {
    on<ApiKeyLoadRequested>(_onLoadRequested);
    on<ApiKeyRefreshRequested>(_onRefreshRequested);
    on<ApiKeyCreateRequested>(_onCreateRequested);
    on<ApiKeyRevokeRequested>(_onRevokeRequested);
    on<ApiKeyUpdateRequested>(_onUpdateRequested);
    on<ApiKeySelected>(_onSelected);
    on<ApiKeyUsageStatsRequested>(_onUsageStatsRequested);
    on<ApiKeyCopied>(_onCopied);
    on<ApiKeyWebSocketEventReceived>(_onWebSocketEventReceived);
  }

  Future<void> _onLoadRequested(
    ApiKeyLoadRequested event,
    Emitter<ApiKeyState> emit,
  ) async {
    emit(state.copyWith(status: ApiKeyStatus.loading, clearError: true));

    try {
      final result = event.environmentId != null
          ? await _repository.getApiKeysForEnvironment(event.environmentId!)
          : await _repository.getApiKeys();

      switch (result) {
        case Success(data: final keys):
          emit(state.copyWith(
            status: ApiKeyStatus.success,
            keys: keys,
          ));
        case Error(failure: final failure):
          _logger.error('Failed to load API keys: ${failure.message}');
          emit(state.copyWith(
            status: ApiKeyStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error loading API keys: $e\n$stack');
      emit(state.copyWith(
        status: ApiKeyStatus.failure,
        errorMessage: 'Failed to load API keys',
      ));
    }
  }

  Future<void> _onRefreshRequested(
    ApiKeyRefreshRequested event,
    Emitter<ApiKeyState> emit,
  ) async {
    add(const ApiKeyLoadRequested());
  }

  Future<void> _onCreateRequested(
    ApiKeyCreateRequested event,
    Emitter<ApiKeyState> emit,
  ) async {
    emit(state.copyWith(status: ApiKeyStatus.creating, clearError: true));

    try {
      final result = await _repository.createApiKey(
        name: event.name,
        permissions: event.permissions,
        environmentId: event.environmentId,
        expiresAt: event.expiresAt,
      );

      switch (result) {
        case Success(data: final createResult):
          _logger.info('API key created: ${createResult.apiKey.id}');
          emit(state.copyWith(
            status: ApiKeyStatus.created,
            keys: [createResult.apiKey, ...state.keys],
            newlyCreatedKey: createResult.apiKey,
            rawKeyForDisplay: createResult.rawKey,
            successMessage: 'API key created successfully. Copy it now - it won\'t be shown again.',
          ));
        case Error(failure: final failure):
          _logger.error('Failed to create API key: ${failure.message}');
          emit(state.copyWith(
            status: ApiKeyStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error creating API key: $e\n$stack');
      emit(state.copyWith(
        status: ApiKeyStatus.failure,
        errorMessage: 'Failed to create API key',
      ));
    }
  }

  Future<void> _onRevokeRequested(
    ApiKeyRevokeRequested event,
    Emitter<ApiKeyState> emit,
  ) async {
    emit(state.copyWith(status: ApiKeyStatus.revoking));

    try {
      final result = await _repository.revokeApiKey(event.keyId);

      switch (result) {
        case Success():
          _logger.info('API key revoked: ${event.keyId}');
          final updatedKeys = state.keys.map((k) {
            if (k.id == event.keyId) {
              return ApiKey(
                id: k.id,
                name: k.name,
                keyPrefix: k.keyPrefix,
                keySuffix: k.keySuffix,
                scopes: k.scopes,
                permissions: k.permissions,
                environmentId: k.environmentId,
                environmentName: k.environmentName,
                createdAt: k.createdAt,
                lastUsedAt: k.lastUsedAt,
                expiresAt: k.expiresAt,
                isActive: false,
                usageCount: k.usageCount,
              );
            }
            return k;
          }).toList();
          emit(state.copyWith(
            status: ApiKeyStatus.revoked,
            keys: updatedKeys,
            successMessage: 'API key revoked',
          ));
        case Error(failure: final failure):
          _logger.error('Failed to revoke API key: ${failure.message}');
          emit(state.copyWith(
            status: ApiKeyStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error revoking API key: $e\n$stack');
      emit(state.copyWith(
        status: ApiKeyStatus.failure,
        errorMessage: 'Failed to revoke API key',
      ));
    }
  }

  Future<void> _onUpdateRequested(
    ApiKeyUpdateRequested event,
    Emitter<ApiKeyState> emit,
  ) async {
    emit(state.copyWith(status: ApiKeyStatus.loading));

    try {
      final result = await _repository.updateApiKey(
        id: event.keyId,
        name: event.name,
        permissions: event.permissions,
        expiresAt: event.expiresAt,
      );

      switch (result) {
        case Success(data: final updatedKey):
          _logger.info('API key updated: ${event.keyId}');
          final updatedKeys = state.keys.map((k) {
            if (k.id == event.keyId) return updatedKey;
            return k;
          }).toList();
          emit(state.copyWith(
            status: ApiKeyStatus.success,
            keys: updatedKeys,
            successMessage: 'API key updated',
          ));
        case Error(failure: final failure):
          _logger.error('Failed to update API key: ${failure.message}');
          emit(state.copyWith(
            status: ApiKeyStatus.failure,
            errorMessage: failure.message,
          ));
      }
    } catch (e, stack) {
      _logger.error('Error updating API key: $e\n$stack');
      emit(state.copyWith(
        status: ApiKeyStatus.failure,
        errorMessage: 'Failed to update API key',
      ));
    }
  }

  void _onSelected(
    ApiKeySelected event,
    Emitter<ApiKeyState> emit,
  ) {
    final key = state.keys.firstWhere(
      (k) => k.id == event.keyId,
      orElse: () => state.keys.first,
    );
    emit(state.copyWith(selectedKey: key));
  }

  Future<void> _onUsageStatsRequested(
    ApiKeyUsageStatsRequested event,
    Emitter<ApiKeyState> emit,
  ) async {
    try {
      final result = await _repository.getApiKeyUsageStats(event.keyId);

      switch (result) {
        case Success(data: final stats):
          emit(state.copyWith(usageStats: stats));
        case Error():
          break;
      }
    } catch (e, stack) {
      _logger.error('Error loading API key usage stats: $e\n$stack');
    }
  }

  Future<void> _onCopied(
    ApiKeyCopied event,
    Emitter<ApiKeyState> emit,
  ) async {
    emit(state.copyWith(status: ApiKeyStatus.copied));
    // Clear the copied status after a delay
    await Future.delayed(const Duration(seconds: 2));
    emit(state.copyWith(status: ApiKeyStatus.success));
  }

  void _onWebSocketEventReceived(
    ApiKeyWebSocketEventReceived event,
    Emitter<ApiKeyState> emit,
  ) {
    _logger.debug('Received API key WebSocket event: ${event.eventType}');

    switch (event.eventType) {
      case 'api_key_created':
        add(const ApiKeyLoadRequested());
        break;
      case 'api_key_revoked':
        if (event.keyId != null) {
          final updatedKeys = state.keys.map((k) {
            if (k.id == event.keyId) {
              return ApiKey(
                id: k.id,
                name: k.name,
                keyPrefix: k.keyPrefix,
                keySuffix: k.keySuffix,
                scopes: k.scopes,
                permissions: k.permissions,
                environmentId: k.environmentId,
                environmentName: k.environmentName,
                createdAt: k.createdAt,
                lastUsedAt: k.lastUsedAt,
                expiresAt: k.expiresAt,
                isActive: false,
                usageCount: k.usageCount,
              );
            }
            return k;
          }).toList();
          emit(state.copyWith(keys: updatedKeys));
        }
        break;
      default:
        break;
    }
  }
}