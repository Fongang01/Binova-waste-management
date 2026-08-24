import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class DriverNotificationsScreen extends StatelessWidget {
  const DriverNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold)),
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
              child: const Icon(Icons.notifications_off_rounded, size: 64, color: AppTheme.primaryEmerald),
            ),
            const SizedBox(height: 32),
            const Text('No new notifications', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.darkText)),
            const SizedBox(height: 12),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 40),
              child: Text(
                'We will notify you about new tasks and route updates.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.greyText, fontSize: 14, height: 1.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
