import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';
import '../../widgets/binova_card.dart';

class DriverProfileScreen extends StatefulWidget {
  const DriverProfileScreen({super.key});

  @override
  State<DriverProfileScreen> createState() => _DriverProfileScreenState();
}

class _DriverProfileScreenState extends State<DriverProfileScreen> {
  bool _soundEnabled = true;
  bool _offlineCacheEnabled = true;

  @override
  Widget build(BuildContext context) {
    final authNotifier = context.watch<AuthNotifier>();
    final driverNotifier = context.watch<DriverNotifier>();
    final user = authNotifier.user;

    final displayName = (user?.fullName.isNotEmpty == true) ? user!.fullName : 'Agent Driver';
    final initials = displayName
        .split(' ')
        .where((s) => s.isNotEmpty)
        .take(2)
        .map((s) => s[0].toUpperCase())
        .join();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Agent Profile & Settings',
          style: TextStyle(color: AppTheme.darkText, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          children: [
            CircleAvatar(
              radius: 46,
              backgroundColor: AppTheme.primaryEmerald,
              child: Text(
                initials.isNotEmpty ? initials : 'DR',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              displayName,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(
              user?.email ?? 'driver@binova.cm',
              style: const TextStyle(color: AppTheme.greyText, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Active Field Agent',
                    style: TextStyle(
                      color: Colors.green.shade800,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // DRIVER STATS & ASSIGNMENT
            BinovaCard(
              child: Column(
                children: [
                  _buildProfileInfo(
                    Icons.badge_rounded,
                    'Driver ID',
                    (user?.uid != null && user!.uid.isNotEmpty)
                        ? 'DRV-${user.uid}'
                        : 'DRV-001',
                  ),
                  const Divider(height: 24),
                  _buildProfileInfo(
                    Icons.local_shipping_rounded,
                    'Assigned Truck',
                    driverNotifier.assignedTruck != null
                        ? 'Truck #${driverNotifier.assignedTruck!.id} (${driverNotifier.assignedTruck!.capacity}T)'
                        : 'Auto / Fleet Pool',
                  ),
                  const Divider(height: 24),
                  _buildProfileInfo(
                    Icons.phone_rounded,
                    'Phone Number',
                    (user?.phone != null && user!.phone.isNotEmpty)
                        ? user.phone
                        : 'Not provided',
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ACCOUNT ACTIONS
            BinovaCard(
              child: Column(
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryGreen.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.person_outline_rounded, color: AppTheme.primaryGreen, size: 20),
                    ),
                    title: const Text('Edit Profile Details', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Update contact phone number', style: TextStyle(fontSize: 12, color: AppTheme.greyText)),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppTheme.greyText),
                    onTap: () => _showEditProfileDialog(context, user, authNotifier),
                  ),
                  const Divider(height: 16),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryGreen.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.lock_reset_rounded, color: AppTheme.primaryGreen, size: 20),
                    ),
                    title: const Text('Change Password', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Ensure secure agent access', style: TextStyle(fontSize: 12, color: AppTheme.greyText)),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppTheme.greyText),
                    onTap: () => _showChangePasswordDialog(context),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // APP PREFERENCES
            BinovaCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('App Preferences', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Audio Alerts for Urgent Tasks', style: TextStyle(fontSize: 14)),
                    value: _soundEnabled,
                    activeColor: AppTheme.primaryGreen,
                    onChanged: (val) => setState(() => _soundEnabled = val),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Offline Route Caching', style: TextStyle(fontSize: 14)),
                    value: _offlineCacheEnabled,
                    activeColor: AppTheme.primaryGreen,
                    onChanged: (val) => setState(() => _offlineCacheEnabled = val),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // LOGOUT BUTTON
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.redAccent,
                  side: const BorderSide(color: Colors.redAccent),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.logout_rounded, size: 20),
                label: const Text('Log Out of Agent Account', style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () => _confirmLogout(context, authNotifier),
              ),
            ),

            const SizedBox(height: 16),
            const Text(
              'Binova Mobile v1.0.4 (Build 12) • Municipal Ops',
              style: TextStyle(color: AppTheme.greyText, fontSize: 11),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileInfo(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.primaryGreen.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: AppTheme.primaryGreen, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: AppTheme.greyText, fontSize: 12)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ],
          ),
        ),
      ],
    );
  }

  void _showEditProfileDialog(BuildContext context, dynamic user, AuthNotifier authNotifier) {
    final phoneCtrl = TextEditingController(text: user?.phone ?? '');
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Edit Profile Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  prefixIcon: Icon(Icons.phone),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryGreen,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: isSaving ? null : () async {
                    setModalState(() => isSaving = true);
                    try {
                      await ApiClient().dio.put('/api/auth/profile', data: {
                        'phone': phoneCtrl.text.trim(),
                      });
                      await authNotifier.checkAuthStatus();
                      if (context.mounted) {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Profile details updated successfully!')),
                        );
                      }
                    } catch (e) {
                      setModalState(() => isSaving = false);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Failed to update: $e'), backgroundColor: Colors.red),
                        );
                      }
                    }
                  },
                  child: Text(isSaving ? 'Saving...' : 'Save Changes', style: const TextStyle(color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final currentPassCtrl = TextEditingController();
    final newPassCtrl = TextEditingController();
    final confirmPassCtrl = TextEditingController();
    bool isSaving = false;
    bool hideCurrent = true;
    bool hideNew = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Change Account Password', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: currentPassCtrl,
                obscureText: hideCurrent,
                decoration: InputDecoration(
                  labelText: 'Current Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(hideCurrent ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setModalState(() => hideCurrent = !hideCurrent),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: newPassCtrl,
                obscureText: hideNew,
                decoration: InputDecoration(
                  labelText: 'New Password (min 6 chars)',
                  prefixIcon: const Icon(Icons.lock_reset_rounded),
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(hideNew ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setModalState(() => hideNew = !hideNew),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: confirmPassCtrl,
                obscureText: hideNew,
                decoration: const InputDecoration(
                  labelText: 'Confirm New Password',
                  prefixIcon: Icon(Icons.check_circle_outline),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryGreen,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: isSaving ? null : () async {
                    if (currentPassCtrl.text.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please enter your current password')),
                      );
                      return;
                    }
                    if (newPassCtrl.text.length < 6) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('New password must be at least 6 characters')),
                      );
                      return;
                    }
                    if (newPassCtrl.text != confirmPassCtrl.text) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Passwords do not match')),
                      );
                      return;
                    }

                    setModalState(() => isSaving = true);
                    try {
                      await ApiClient().dio.put('/api/auth/change-password', data: {
                        'currentPassword': currentPassCtrl.text,
                        'newPassword': newPassCtrl.text,
                      });
                      if (context.mounted) {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Password updated successfully!')),
                        );
                      }
                    } catch (e) {
                      setModalState(() => isSaving = false);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Error: ${e.toString().replaceAll("Exception:", "")}'),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    }
                  },
                  child: Text(isSaving ? 'Updating...' : 'Update Password', style: const TextStyle(color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthNotifier authNotifier) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log Out'),
        content: const Text('Are you sure you want to log out of Binova Agent? You will need to sign in again to receive collection tasks.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              Navigator.pop(ctx);
              authNotifier.logout();
            },
            child: const Text('Log Out', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

