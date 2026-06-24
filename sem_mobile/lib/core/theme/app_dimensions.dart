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

  // Component-specific
  static const double appBarHeight = 56;
  static const double bottomNavHeight = 80;
  static const double fabSize = 56;
  static const double iconSize = 24;
  static const double iconSizeSm = 20;
  static const double iconSizeLg = 32;
}

/// Application icon sizing
abstract final class AppIcons {
  static const double xs = 12;
  static const double sm = 16;
  static const double md = 20;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
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

  // Semantic radius - use these for consistency
  static const double button = sm;
  static const double input = sm;
  static const double card = md;
  static const double modal = lg;
  static const double sheet = xl;
  static const double chip = full;
  static const double avatar = full;
  static const double iconContainer = md;
}

/// Application shadow system - elevation values
abstract final class AppShadows {
  static const double smBlur = 4;
  static const double smOffset = 1;
  static const double mdBlur = 8;
  static const double mdOffset = 2;
  static const double lgBlur = 16;
  static const double lgOffset = 4;
  static const double xlBlur = 24;
  static const double xlOffset = 8;

  // Semantic shadows
  static const double card = smBlur;
  static const double modal = lgBlur;
  static const double fab = mdBlur;
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

  // Semantic durations
  static const int pageTransition = slow;
  static const int shimmerCycle = 1500;
  static const int snackbarDuration = 3000;
  static const int toastDuration = 2000;
}