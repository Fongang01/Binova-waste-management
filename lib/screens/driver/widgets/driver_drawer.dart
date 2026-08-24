import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_assets.dart';
import '../../../core/routes/app_routes.dart';
import '../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../features/driver/presentation/providers/driver_provider.dart';

class DriverDrawer extends StatelessWidget {
  const DriverDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authNotifier = context.watch<AuthNotifier>();
    final driverNotifier = context.watch<DriverNotifier>();
    final user = authNotifier.user;
    final fullName = user?.fullName ?? 'Agent';

    return Drawer(
      backgroundColor: Colors.white,
      width: MediaQuery.of(context).size.width * 0.85,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.only(top: 60, bottom: 32, left: 24, right: 24),
            decoration: BoxDecoration(
              gradient: AppTheme.darkGradient,
              borderRadius: const BorderRadius.only(topRight: Radius.circular(32)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)
                            ]
                          ),
                          child: Image.asset(AppAssets.logo, height: 28),
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          'BINOVA',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded, color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                Row(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withOpacity(0.2), width: 2),
                      ),
                      child: CircleAvatar(
                        radius: 32,
                        backgroundColor: Colors.white.withOpacity(0.15),
                        child: Text(
                          fullName.isNotEmpty ? fullName[0].toUpperCase() : 'A',
                          style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            fullName,
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Collection Driver',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
              children: [
                _drawerItem(context, Icons.home_rounded, 'Home', onTap: () {
                   Navigator.pop(context);
                   driverNotifier.setTabIndex(0);
                }),
                _drawerItem(context, Icons.assignment_rounded, 'My Tasks', onTap: () {
                   Navigator.pop(context);
                   driverNotifier.setTabIndex(1);
                }),
                _drawerItem(context, Icons.alt_route_rounded, 'Optimized Route', onTap: () {
                   Navigator.pop(context);
                   context.push(AppRoutes.driverRoute);
                }),
                _drawerItem(context, Icons.map_rounded, 'Map', onTap: () {
                   Navigator.pop(context);
                   driverNotifier.setTabIndex(2);
                }),
                _drawerItem(context, Icons.history_rounded, 'Collection History', onTap: () {
                   Navigator.pop(context);
                   context.push(AppRoutes.driverHistory);
                }),
                _drawerItem(context, Icons.person_rounded, 'Profile', onTap: () {
                   Navigator.pop(context);
                   driverNotifier.setTabIndex(3);
                }),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Divider(height: 1, color: Color(0xFFF0F0F0)),
                ),
                _drawerItem(
                  context,
                  Icons.logout_rounded,
                  'Logout',
                  color: Colors.redAccent,
                  onTap: () async {
                    Navigator.pop(context);
                    await authNotifier.logout();
                  },
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Text(
              'BINOVA • PRO v1.2.5',
              style: TextStyle(color: AppTheme.greyText.withOpacity(0.4), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
          ),
        ],
      ),
    );
  }

  Widget _drawerItem(BuildContext context, IconData icon, String title, {required VoidCallback onTap, Color? color}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        leading: Icon(icon, color: color ?? AppTheme.darkText.withOpacity(0.7), size: 24),
        title: Text(
          title,
          style: TextStyle(
            color: color ?? AppTheme.darkText, 
            fontWeight: FontWeight.w600, 
            fontSize: 15,
          ),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
        onTap: onTap,
        hoverColor: AppTheme.primaryEmerald.withOpacity(0.05),
      ),
    );
  }
}
