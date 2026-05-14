import 'package:equatable/equatable.dart';

/// Base class for all entities
abstract class Entity extends Equatable {
  const Entity();

  @override
  List<Object?> get props => [];
}

/// User entity
class User extends Entity {
  final String id;
  final String username;
  final String email;
  final String? avatarUrl;
  final DateTime createdAt;
  final DateTime? lastLoginAt;

  const User({
    required this.id,
    required this.username,
    required this.email,
    this.avatarUrl,
    required this.createdAt,
    this.lastLoginAt,
  });

  @override
  List<Object?> get props => [id, username, email, avatarUrl, createdAt, lastLoginAt];
}