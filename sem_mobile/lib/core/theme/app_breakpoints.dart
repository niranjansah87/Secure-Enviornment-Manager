/// Application responsive breakpoints
abstract final class AppBreakpoints {
  static const double mobile = 375;
  static const double tablet = 600;
  static const double desktop = 900;
  static const double wide = 1200;

  /// Returns true if screen is tablet or larger
  static bool isTablet(BuildContext context) {
    return MediaQuery.of(context).size.shortestSide >= tablet;
  }

  /// Returns true if screen is desktop or larger
  static bool isDesktop(BuildContext context) {
    return MediaQuery.of(context).size.width >= desktop;
  }

  /// Optimal grid column count based on screen width
  static int gridColumns(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width >= wide) return 4;
    if (width >= desktop) return 3;
    if (width >= tablet) return 2;
    return 1;
  }

  /// Optimal secret grid column count
  static int secretGridColumns(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width >= wide) return 4;
    if (width >= desktop) return 3;
    if (width >= tablet) return 2;
    return 2; // Always at least 2 columns on mobile for secrets
  }
}