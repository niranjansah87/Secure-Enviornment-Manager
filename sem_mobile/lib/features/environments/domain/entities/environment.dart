import 'package:equatable/equatable.dart';

/// Namespace entity - represents a collection of environments
class Namespace extends Equatable {
  final String id;
  final String name;
  final String? description;
  final String ownerId;
  final List<String> memberIds;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool isDefault;

  const Namespace({
    required this.id,
    required this.name,
    this.description,
    required this.ownerId,
    this.memberIds = const [],
    required this.createdAt,
    this.updatedAt,
    this.isDefault = false,
  });

  factory Namespace.fromJson(Map<String, dynamic> json) {
    return Namespace(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      ownerId: json['owner_id']?.toString() ?? '',
      memberIds: (json['member_ids'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      isDefault: json['is_default'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      if (description != null) 'description': description,
      'owner_id': ownerId,
      'member_ids': memberIds,
      'created_at': createdAt.toIso8601String(),
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
      'is_default': isDefault,
    };
  }

  @override
  List<Object?> get props => [
        id,
        name,
        description,
        ownerId,
        memberIds,
        createdAt,
        updatedAt,
        isDefault,
      ];
}

/// Environment entity - represents a secrets environment
class Environment extends Equatable {
  final String id;
  final String namespaceId;
  final String name;
  final String? description;
  final String? color;
  final String icon;
  final int secretCount;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool isFavorite;

  const Environment({
    required this.id,
    required this.namespaceId,
    required this.name,
    this.description,
    this.color,
    this.icon = 'key',
    this.secretCount = 0,
    required this.createdAt,
    this.updatedAt,
    this.isFavorite = false,
  });

  factory Environment.fromJson(Map<String, dynamic> json) {
    return Environment(
      id: json['id']?.toString() ?? '',
      namespaceId: json['namespace_id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      color: json['color'] as String?,
      icon: json['icon'] as String? ?? 'key',
      secretCount: json['secret_count'] as int? ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      isFavorite: json['is_favorite'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'namespace_id': namespaceId,
      'name': name,
      if (description != null) 'description': description,
      if (color != null) 'color': color,
      'icon': icon,
      'secret_count': secretCount,
      'created_at': createdAt.toIso8601String(),
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
      'is_favorite': isFavorite,
    };
  }

  Environment copyWith({
    String? id,
    String? namespaceId,
    String? name,
    String? description,
    String? color,
    String? icon,
    int? secretCount,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isFavorite,
  }) {
    return Environment(
      id: id ?? this.id,
      namespaceId: namespaceId ?? this.namespaceId,
      name: name ?? this.name,
      description: description ?? this.description,
      color: color ?? this.color,
      icon: icon ?? this.icon,
      secretCount: secretCount ?? this.secretCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }

  @override
  List<Object?> get props => [
        id,
        namespaceId,
        name,
        description,
        color,
        icon,
        secretCount,
        createdAt,
        updatedAt,
        isFavorite,
      ];
}