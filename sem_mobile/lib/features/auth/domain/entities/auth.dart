import 'package:equatable/equatable.dart';

/// Authentication tokens
class AuthTokens extends Equatable {
  final String accessToken;
  final String? refreshToken;
  final DateTime? expiresAt;

  const AuthTokens({
    required this.accessToken,
    this.refreshToken,
    this.expiresAt,
  });

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    return AuthTokens(
      accessToken: json['access_token'] as String? ?? json['token'] as String,
      refreshToken: json['refresh_token'] as String?,
      expiresAt: json['expires_at'] != null
          ? DateTime.tryParse(json['expires_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'access_token': accessToken,
      if (refreshToken != null) 'refresh_token': refreshToken,
      if (expiresAt != null) 'expires_at': expiresAt!.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [accessToken, refreshToken, expiresAt];
}

/// Login credentials
class LoginCredentials extends Equatable {
  final String username;
  final String password;

  const LoginCredentials({
    required this.username,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'username': username,
      'password': password,
    };
  }

  @override
  List<Object?> get props => [username, password];
}

/// Auth response from API
class AuthResponse extends Equatable {
  final AuthTokens tokens;
  final User? user;

  const AuthResponse({
    required this.tokens,
    this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      tokens: AuthTokens.fromJson(json),
      user: json['user'] != null ? User.fromJson(Map<String, dynamic>.from(json['user'] as Map)) : null,
    );
  }

  @override
  List<Object?> get props => [tokens, user];
}

/// User profile
class User extends Equatable {
  final String id;
  final String username;
  final String? email;
  final String? displayName;
  final String? avatarUrl;
  final List<String> roles;
  final DateTime createdAt;
  final DateTime? lastLoginAt;

  const User({
    required this.id,
    required this.username,
    this.email,
    this.displayName,
    this.avatarUrl,
    this.roles = const [],
    required this.createdAt,
    this.lastLoginAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      username: json['username'] as String? ?? '',
      email: json['email'] as String?,
      displayName: json['display_name'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      roles: (json['roles'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      lastLoginAt: json['last_login_at'] != null
          ? DateTime.parse(json['last_login_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      if (email != null) 'email': email,
      if (displayName != null) 'display_name': displayName,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      'roles': roles,
      'created_at': createdAt.toIso8601String(),
      if (lastLoginAt != null) 'last_login_at': lastLoginAt!.toIso8601String(),
    };
  }

  String get initials {
    if (displayName != null && displayName!.isNotEmpty) {
      final parts = displayName!.split(' ');
      if (parts.length >= 2) {
        return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      }
      return displayName![0].toUpperCase();
    }
    if (username.isNotEmpty) {
      return username[0].toUpperCase();
    }
    return '?';
  }

  @override
  List<Object?> get props => [
        id,
        username,
        email,
        displayName,
        avatarUrl,
        roles,
        createdAt,
        lastLoginAt,
      ];
}