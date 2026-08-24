import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import 'binova_card.dart';

class StatCard extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final Color? iconColor;
  final Color? bgColor;

  const StatCard({
    super.key,
    required this.value,
    required this.label,
    required this.icon,
    this.iconColor,
    this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return BinovaCard(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      width: 105,
      borderRadius: 20,
      color: bgColor ?? Colors.white,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: (iconColor ?? AppTheme.primaryGreen).withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor ?? AppTheme.primaryGreen, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: AppTheme.darkText,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.greyText,
              fontSize: 10,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}
