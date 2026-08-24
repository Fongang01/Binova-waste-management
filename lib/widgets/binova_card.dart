import 'dart:ui';
import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

class BinovaCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double? borderRadius;
  final Color? color;
  final Gradient? gradient;
  final List<BoxShadow>? boxShadow;
  final double? width;
  final double? height;
  final Border? border;
  final bool useGlass;
  final VoidCallback? onTap;

  const BinovaCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius,
    this.color,
    this.gradient,
    this.boxShadow,
    this.width,
    this.height,
    this.border,
    this.useGlass = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget content = Container(
      width: width,
      height: height,
      padding: padding ?? const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: useGlass 
            ? Colors.white.withOpacity(0.4) 
            : (gradient == null ? (color ?? Colors.white) : null),
        gradient: useGlass ? null : gradient,
        borderRadius: BorderRadius.circular(borderRadius ?? 24),
        border: border ?? (useGlass ? Border.all(color: Colors.white.withOpacity(0.2)) : null),
        boxShadow: boxShadow ?? AppTheme.premiumShadow,
      ),
      child: child,
    );

    if (useGlass) {
      content = ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius ?? 24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: content,
        ),
      );
    }

    if (onTap != null) {
      return Container(
        margin: margin,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(borderRadius ?? 24),
            splashColor: AppTheme.primaryEmerald.withOpacity(0.1),
            highlightColor: AppTheme.primaryEmerald.withOpacity(0.05),
            child: content,
          ),
        ),
      );
    }

    return Container(
      margin: margin,
      child: content,
    );
  }
}
