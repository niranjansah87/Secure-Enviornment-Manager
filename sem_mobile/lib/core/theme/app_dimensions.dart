/// Application spacing system based on 4px grid
abstract final class AppSpacing {
  static const double xxs = 4;
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
  static const double xxxl = 64;

  // Semantic spacing
  static const double contentPadding = md;
  static const double cardPadding = lg;
  static const double screenPadding = lg;
  static const double sectionGap = xl;
  static const double itemGap = sm;
}

/// Application radius system
abstract final class AppRadius {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double full = 9999;

  // Semantic radius
  static const double button = sm;
  static const double input = sm;
  static const double card = md;
  static const double modal = lg;
  static const double sheet = xl;
}

/// Application shadow system
abstract final class AppShadows {
  static const double smBlur = 4;
  static const double smOffset = 1;
  static const double mdBlur = 8;
  static const double mdOffset = 2;
  static const double lgBlur = 16;
  static const double lgOffset = 4;
  static const double xlBlur = 24;
  static const double xlOffset = 8;
}

/// Animation durations in milliseconds
abstract final class AppDurations {
  static const int instant = 0;
  static const int fastest = 100;
  static const int fast = 200;
  static const int normal = 300;
  static const int slow = 400;
  static const int slower = 600;
  static const int slowest = 800;
  static const int marathon = 1000;
}