import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';
import '../../widgets/binova_card.dart';

class DriverProfileScreen extends StatelessWidget {
  const DriverProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authNotifier = context.watch<AuthNotifier>();
    final driverNotifier = context.watch<DriverNotifier>();
    final user = authNotifier.user;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Agent Profile', style: TextStyle(color: AppTheme.darkText, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const CircleAvatar(
              radius: 50,
              backgroundColor: AppTheme.primaryGreen,
              child: Icon(Icons.person_rounded, size: 60, color: Colors.white),
            ),
            const SizedBox(height: 16),
            Text(user?.fullName ?? 'Agent Name', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            Text(user?.email ?? 'agent@hysacam.cm', style: const TextStyle(color: AppTheme.greyText)),
            const SizedBox(height: 32),
            
            BinovaCard(
              child: Column(
                children: [
                  _buildProfileInfo(Icons.badge_rounded, 'Driver ID', 'D-2024-001'),
                  const Divider(height: 32),
                  _buildProfileInfo(Icons.local_shipping_rounded, 'Assigned Truck', driverNotifier.assignedTruck?.id ?? 'Not Assigned'),
                  const Divider(height: 32),
                  _buildProfileInfo(Icons.phone_rounded, 'Phone', user?.phone ?? 'N/A'),
                ],
              ),
            ),
            
            const SizedBox(height: 32),
            ListTile(
              leading: const Icon(Icons.edit_outlined, color: AppTheme.primaryGreen),
              title: const Text('Edit Profile'),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.lock_reset_rounded, color: AppTheme.primaryGreen),
              title: const Text('Change Password'),
              onTap: () {},
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
              title: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
              onTap: () => authNotifier.logout(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileInfo(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primaryGreen, size: 22),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppTheme.greyText, fontSize: 12)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          ],
        ),
      ],
    );
  }
}
