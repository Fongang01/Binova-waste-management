import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class DriverHistoryScreen extends StatelessWidget {
  const DriverHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Collection History', style: TextStyle(fontWeight: FontWeight.bold)),
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
              child: const Icon(Icons.history_rounded, size: 64, color: AppTheme.primaryEmerald),
            ),
            const SizedBox(height: 32),
            const Text('No history yet', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.darkText)),
            const SizedBox(height: 12),
            const Text('Your completed collections will appear here.', style: TextStyle(color: AppTheme.greyText, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}
