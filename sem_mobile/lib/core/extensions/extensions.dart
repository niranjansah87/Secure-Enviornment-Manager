import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Material theme extension for custom colors
extension ThemeExtensions on ThemeData {
  Color get surfaceElevated => AppColors.surfaceElevated;
  Color get borderColor => AppColors.border;
  Color get secretColor => AppColors.secret;
  Color get environmentColor => AppColors.environment;
}

/// Color scheme extension
extension ColorSchemeExtensions on ColorScheme {
  Color get success => AppColors.success;
  Color get warning => AppColors.warning;
  Color get error => AppColors.error;
  Color get info => AppColors.info;
  Color get secret => AppColors.secret;
  Color get environment => AppColors.environment;
}

/// Context extensions for easy theme access
extension ThemeContextExtensions on BuildContext {
  ThemeData get theme => Theme.of(this);
  ColorScheme get colorScheme => theme.colorScheme;
  TextTheme get textTheme => theme.textTheme;
  bool get isDarkMode => theme.brightness == Brightness.dark;
}

/// Text style extensions
extension TextStyleExtensions on TextStyle {
  TextStyle get semibold => copyWith(fontWeight: FontWeight.w600);
  TextStyle get medium => copyWith(fontWeight: FontWeight.w500);
  TextStyle get bold => copyWith(fontWeight: FontWeight.w700);

  TextStyle withSecondary(BuildContext context) {
    return copyWith(color: AppColors.textSecondary);
  }

  TextStyle withTertiary(BuildContext context) {
    return copyWith(color: AppColors.textTertiary);
  }
}

/// String extensions
extension StringExtensions on String {
  String get capitalize {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }

  String get initials {
    if (isEmpty) return '';
    final words = split(' ').where((w) => w.isNotEmpty);
    if (words.length == 1) {
      return words.first[0].toUpperCase();
    }
    return words.take(2).map((w) => w[0].toUpperCase()).join();
  }

  bool get isValidEmail {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(this);
  }
}

/// DateTime extensions
extension DateTimeExtensions on DateTime {
  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(this);

    if (difference.inDays > 365) {
      return '${(difference.inDays / 365).floor()}y ago';
    } else if (difference.inDays > 30) {
      return '${(difference.inDays / 30).floor()}mo ago';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}

/// List extensions
extension ListExtensions<T> on List<T> {
  List<T> takeLast(int n) {
    if (length <= n) return this;
    return sublist(length - n);
  }
}