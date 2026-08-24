import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_strings.dart';
import '../../core/constants/app_assets.dart';
import '../../core/routes/app_routes.dart';
import '../../core/theme/app_theme.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        decoration: BoxDecoration(
          gradient: AppTheme.meshGradient,
        ),
        child: Column(
          children: [
            const Spacer(flex: 2),
            // Illustration Placeholder / Logo
            Hero(
              tag: 'logo',
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryEmerald.withOpacity(0.1),
                      blurRadius: 40,
                      offset: const Offset(0, 20),
                    ),
                  ],
                ),
                child: Image.asset(
                  AppAssets.logo,
                  width: 160,
                ),
              ),
            ),
            const SizedBox(height: 60),
            Text(
              AppStrings.welcomeTitle,
              style: Theme.of(context).textTheme.headlineLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'Professional tool for HYSACAM authorized waste collection agents.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppTheme.greyText,
                    ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 60),
            
            // Buttons area
            Container(
              width: double.infinity,
              height: 56,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: AppTheme.primaryGradient,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryEmerald.withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: () => context.push(AppRoutes.login),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                child: const Text('Agent Login', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Not an agent? Please contact your administrator.',
              style: TextStyle(color: AppTheme.greyText, fontSize: 12, fontWeight: FontWeight.w500),
              textAlign: TextAlign.center,
            ),
            
            const Spacer(flex: 1),
            Text(
              'Binova • Sustainable Waste Management 🌿',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
