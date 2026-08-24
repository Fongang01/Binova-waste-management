import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

class ComingSoonScreen extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;

  const ComingSoonScreen({
    super.key,
    required this.title,
    required this.description,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Navigator.of(context).canPop() 
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: AppTheme.darkText),
                onPressed: () => Navigator.of(context).pop(),
              )
            : IconButton(
                icon: const Icon(Icons.menu_rounded, color: AppTheme.darkText),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: AppTheme.primaryGreen.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 80, color: AppTheme.primaryGreen),
              ),
              const SizedBox(height: 32),
              Text(
                'Coming Soon',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryGreen,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                description,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppTheme.greyText, fontSize: 16),
              ),
              const SizedBox(height: 48),
              Text(
                'We are working hard to bring you this feature by 2026. 🌿',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.greyText.withOpacity(0.6), fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
