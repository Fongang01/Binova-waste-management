import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // --- New Premium Palette ---
  static const Color primaryEmerald = Color(0xFF00833E);
  static const Color accentMint = Color(0xFF2ECC71);
  static const Color darkEmerald = Color(0xFF005C2B);
  static const Color softMint = Color(0xFFE8F8F5);
  static const Color skyBlue = Color(0xFFEBF5FB);
  
  // --- Backward Compatibility Aliases ---
  static const Color primaryGreen = primaryEmerald;
  static const Color secondaryGreen = accentMint;
  static const Color darkGreen = darkEmerald;
  static const Color lightGreen = softMint;
  static const Color veryLightGreen = softMint;
  
  static const Color background = Color(0xFFF7FAF8);
  static const Color cardWhite = Color(0xFFFFFFFF);
  static const Color darkText = Color(0xFF172033);
  static const Color greyText = Color(0xFF667085);

  // --- Dynamic Gradients ---
  static LinearGradient get primaryGradient => const LinearGradient(
        colors: [primaryEmerald, accentMint],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  static LinearGradient get darkGradient => const LinearGradient(
        colors: [darkEmerald, primaryEmerald],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  static LinearGradient get meshGradient => LinearGradient(
        colors: [
          primaryEmerald.withOpacity(0.08),
          softMint.withOpacity(0.5),
          Colors.white,
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      );

  static LinearGradient get softGradient => LinearGradient(
        colors: [softMint.withOpacity(0.3), Colors.white],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      );

  // Alias for compatibility
  static LinearGradient get bgGradient => meshGradient;

  // --- Enhanced Shadows ---
  static List<BoxShadow> get premiumShadow => [
        BoxShadow(
          color: primaryEmerald.withOpacity(0.06),
          blurRadius: 24,
          offset: const Offset(0, 12),
        ),
      ];

  // Alias for compatibility
  static List<BoxShadow> get softShadow => premiumShadow;

  static ThemeData get lightTheme {
    final baseTheme = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryEmerald,
        primary: primaryEmerald,
        secondary: accentMint,
        surface: cardWhite,
      ),
      scaffoldBackgroundColor: background,
    );

    return baseTheme.copyWith(
      textTheme: GoogleFonts.poppinsTextTheme(baseTheme.textTheme).copyWith(
        headlineLarge: GoogleFonts.poppins(
          color: darkText,
          fontSize: 32,
          fontWeight: FontWeight.bold,
          letterSpacing: -0.8,
        ),
        headlineMedium: GoogleFonts.poppins(
          color: darkText,
          fontSize: 26,
          fontWeight: FontWeight.w800,
        ),
        titleLarge: GoogleFonts.poppins(
          color: darkText,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        bodyLarge: GoogleFonts.poppins(color: darkText, fontSize: 16),
        bodyMedium: GoogleFonts.poppins(color: greyText, fontSize: 14),
        labelLarge: GoogleFonts.poppins(color: greyText, fontSize: 12, fontWeight: FontWeight.w500),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: primaryEmerald, width: 2.0),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: Colors.red, width: 2.0),
        ),
        errorStyle: const TextStyle(color: Colors.redAccent, fontSize: 13, fontWeight: FontWeight.w600),
        prefixIconColor: greyText,
        suffixIconColor: greyText,
        hintStyle: const TextStyle(color: greyText, fontSize: 14),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        elevation: 0,
        indicatorColor: primaryEmerald.withOpacity(0.1),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return GoogleFonts.poppins(color: primaryEmerald, fontSize: 12, fontWeight: FontWeight.bold);
          }
          return GoogleFonts.poppins(color: greyText, fontSize: 12);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: primaryEmerald, size: 26);
          }
          return const IconThemeData(color: greyText, size: 24);
        }),
      ),
    );
  }
}
