import 'package:flutter/material.dart';

/// Application color palette - security-focused enterprise design
abstract final class AppColors {
  // Primary - Deep Navy (trust, security, professionalism)
  static const Color primary = Color(0xFF0A1628);
  static const Color primaryLight = Color(0xFF1A2A44);
  static const Color primaryDark = Color(0xFF050D17);

  // Accent - Electric Blue (technology, innovation)
  static const Color accent = Color(0xFF3B82F6);
  static const Color accentLight = Color(0xFF60A5FA);
  static const Color accentDark = Color(0xFF2563EB);

  // Semantic Colors
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFF34D399);
  static const Color successDark = Color(0xFF059669);

  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFBBF24);
  static const Color warningDark = Color(0xFFD97706);

  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFF87171);
  static const Color errorDark = Color(0xFFDC2626);

  static const Color info = Color(0xFF06B6D4);
  static const Color infoLight = Color(0xFF22D3EE);
  static const Color infoDark = Color(0xFF0891B2);

  // Neutrals
  static const Color background = Color(0xFF0F172A);
  static const Color surface = Color(0xFF1E293B);
  static const Color surfaceLight = Color(0xFF334155);
  static const Color surfaceElevated = Color(0xFF1E293B);

  static const Color border = Color(0xFF334155);
  static const Color borderLight = Color(0xFF475569);
  static const Color divider = Color(0xFF1E293B);

  // Text
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textTertiary = Color(0xFF64748B);
  static const Color textDisabled = Color(0xFF475569);

  // Status-specific for secrets management
  static const Color secret = Color(0xFF8B5CF6);
  static const Color secretLight = Color(0xFFA78BFA);
  static const Color environment = Color(0xFF14B8A6);
  static const Color environmentLight = Color(0xFF2DD4BF);

  // Overlay
  static const Color overlay = Color(0x80000000);
  static const Color scrim = Color(0x40000000);
}

/// Light theme colors
abstract final class AppColorsLight {
  static const Color primary = Color(0xFF1E40AF);
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceLight = Color(0xFFF1F5F9);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color border = Color(0xFFE2E8F0);
}