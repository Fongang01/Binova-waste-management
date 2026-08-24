import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class DriverRouteScreen extends StatelessWidget {
  const DriverRouteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Optimized Route', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(gradient: AppTheme.bgGradient),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: AppTheme.primaryEmerald.withOpacity(0.1), blurRadius: 40)
                ],
              ),
              child: const Icon(Icons.alt_route_rounded, size: 64, color: AppTheme.primaryEmerald),
            ),
            const SizedBox(height: 32),
            const Text(
              'Route Planning',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.darkText),
            ),
            const SizedBox(height: 16),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 50),
              child: Text(
                'Your AI-optimized collection route will appear here once a task is assigned.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.greyText, height: 1.6, fontSize: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
