import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/constants/app_assets.dart';
import '../../core/routes/app_routes.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';
import '../../widgets/binova_card.dart';

class DriverHomeScreen extends StatelessWidget {
  const DriverHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authNotifier = context.watch<AuthNotifier>();
    final driverNotifier = context.watch<DriverNotifier>();
    final user = authNotifier.user;
    final driverName = user?.fullName.split(' ').first ?? '...';
    final now = DateTime.now();
    final formattedDate = DateFormat('EEEE, d MMMM').format(now);

    final completedTasks = driverNotifier.tasks.where((t) => t.status.name == 'completed').length;
    final pendingTasks = driverNotifier.tasks.where((t) => t.status.name != 'completed').length;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        leading: IconButton(
          onPressed: () => Scaffold.of(context).openDrawer(),
          icon: const Icon(Icons.menu_rounded, color: AppTheme.darkText, size: 28),
        ),
        title: Row(
          children: [
            Image.asset(AppAssets.logo, height: 32),
            const SizedBox(width: 10),
            Text(
              'BINOVA',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: AppTheme.primaryEmerald,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => context.push(AppRoutes.driverNotifications),
            icon: const Icon(Icons.notifications_none_rounded, color: AppTheme.darkText, size: 28),
          ),
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CircleAvatar(
              radius: 18,
              backgroundColor: AppTheme.primaryEmerald.withOpacity(0.1),
              child: Text(
                driverName.isNotEmpty && driverName != '...' ? driverName[0].toUpperCase() : 'A',
                style: const TextStyle(color: AppTheme.primaryEmerald, fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: BoxDecoration(gradient: AppTheme.meshGradient),
        child: driverNotifier.isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryEmerald))
            : RefreshIndicator(
                onRefresh: () => driverNotifier.loadDashboardData(),
                color: AppTheme.primaryEmerald,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 120), // Spacing for extended appBar
                      Text(
                        'Hello, $driverName 👋',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      Text(
                        formattedDate,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      
                      const SizedBox(height: 30),
                      // Today's Collection Card - Premium Multi-stop Gradient
                      BinovaCard(
                        padding: const EdgeInsets.all(24),
                        gradient: LinearGradient(
                          colors: [
                            AppTheme.primaryEmerald,
                            AppTheme.accentMint,
                            AppTheme.accentMint.withOpacity(0.8),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryEmerald.withOpacity(0.2),
                            blurRadius: 30,
                            offset: const Offset(0, 15),
                          ),
                        ],
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Today\'s Collection Tasks',
                              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildWhiteStat('Assigned', driverNotifier.tasks.length.toString(), Icons.assignment_rounded),
                                _buildWhiteStat('Completed', completedTasks.toString(), Icons.task_alt_rounded),
                                _buildWhiteStat('Pending', pendingTasks.toString(), Icons.hourglass_empty_rounded),
                              ],
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Priority Collections',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          TextButton(
                            onPressed: () => driverNotifier.setTabIndex(1),
                            child: const Text('View all', style: TextStyle(color: AppTheme.primaryEmerald, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      if (driverNotifier.tasks.isEmpty)
                        _buildEmptyState(
                          'No collection tasks assigned yet',
                          'New tasks will appear here.',
                          Icons.delete_outline_rounded,
                        )
                      else
                        Column(
                          children: driverNotifier.tasks
                              .take(3)
                              .map((task) => BinovaCard(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: const EdgeInsets.all(16),
                                    onTap: () => driverNotifier.setTabIndex(1),
                                    child: Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: AppTheme.softMint,
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: const Icon(Icons.delete_sweep_rounded,
                                              color: AppTheme.primaryEmerald, size: 22),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text('Bin ${task.binId}',
                                                  style: const TextStyle(
                                                      fontWeight: FontWeight.bold, fontSize: 14)),
                                              const SizedBox(height: 2),
                                              Text(task.location,
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                      color: AppTheme.greyText, fontSize: 12)),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text('${task.fillLevel}%',
                                            style: TextStyle(
                                                color: task.fillLevel > 80
                                                    ? Colors.red
                                                    : AppTheme.primaryEmerald,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 15)),
                                      ],
                                    ),
                                  ))
                              .toList(),
                        ),

                      const SizedBox(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'AI Optimized Route',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          if (driverNotifier.activeAiTask != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryEmerald.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: AppTheme.primaryEmerald.withOpacity(0.3)),
                              ),
                              child: Text(
                                '${driverNotifier.activeAiTask!.pendingStopsCount} Pending',
                                style: const TextStyle(
                                  color: AppTheme.primaryEmerald,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      // Glass Card for AI Route
                      Builder(
                        builder: (context) {
                          final aiTask = driverNotifier.activeAiTask;
                          if (aiTask != null) {
                            return BinovaCard(
                              useGlass: true,
                              padding: const EdgeInsets.all(18),
                              border: Border.all(color: AppTheme.primaryEmerald.withOpacity(0.25)),
                              onTap: () => context.push(AppRoutes.driverRoute),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          gradient: AppTheme.primaryGradient,
                                          shape: BoxShape.circle,
                                          boxShadow: [
                                            BoxShadow(color: AppTheme.primaryEmerald.withOpacity(0.25), blurRadius: 8)
                                          ]
                                        ),
                                        child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 24),
                                      ),
                                      const SizedBox(width: 14),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                const Text(
                                                  'AI DISPATCHED ROUTE',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w800,
                                                    letterSpacing: 0.8,
                                                    color: AppTheme.primaryEmerald,
                                                  ),
                                                ),
                                                const Spacer(),
                                                Text(
                                                  '${aiTask.totalStops} Stops Total',
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w700,
                                                    color: AppTheme.darkText,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${aiTask.distanceKm ?? 0} km • Est. ${aiTask.estimatedDuration ?? 0} min',
                                              style: TextStyle(
                                                fontSize: 13,
                                                color: Colors.grey.shade700,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 14),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.7),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: Colors.grey.shade200),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.navigation_rounded,
                                          size: 18,
                                          color: AppTheme.primaryEmerald,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            aiTask.currentStop != null
                                                ? 'Next: Stop #${aiTask.currentStopNumber} — ${aiTask.currentStop!.binCode} (${aiTask.currentStop!.fillLevel}%)'
                                                : 'All route stops completed',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              color: AppTheme.darkText,
                                            ),
                                          ),
                                        ),
                                        const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppTheme.primaryEmerald),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }

                          return BinovaCard(
                            useGlass: true,
                            padding: const EdgeInsets.all(20),
                            border: Border.all(color: AppTheme.primaryEmerald.withOpacity(0.05)),
                            onTap: () => context.push(AppRoutes.driverRoute),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    gradient: AppTheme.primaryGradient,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(color: AppTheme.primaryEmerald.withOpacity(0.2), blurRadius: 10)
                                    ]
                                  ),
                                  child: const Icon(Icons.psychology_rounded, color: Colors.white, size: 32),
                                ),
                                const SizedBox(width: 16),
                                const Expanded(
                                  child: Text(
                                    'No active AI route. Optimized routes will appear here when assigned by admin.',
                                    style: TextStyle(fontSize: 13, height: 1.5, color: AppTheme.darkText, fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),

                      const SizedBox(height: 32),
                      Text(
                        'Assigned Truck',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      if (driverNotifier.assignedTruck == null)
                        _buildEmptyState(
                          'No truck assigned',
                          'You will be notified when a truck is assigned.',
                          Icons.local_shipping_outlined,
                        )
                      else
                        BinovaCard(
                          child: Row(
                            children: [
                              const Icon(Icons.local_shipping_rounded, color: AppTheme.primaryEmerald, size: 44),
                              const SizedBox(width: 16),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('ID: ${driverNotifier.assignedTruck!.id}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                  Text('Capacity: ${driverNotifier.assignedTruck!.capacity}', style: const TextStyle(color: AppTheme.greyText, fontSize: 13)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      
                      const SizedBox(height: 32),
                      Text(
                        'Quick Actions',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 16),
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 2,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                        childAspectRatio: 1.3,
                        children: [
                          _buildQuickAction(context, 'My Tasks', Icons.assignment_rounded, () => driverNotifier.setTabIndex(1)),
                          _buildQuickAction(context, 'Optimized Route', Icons.route_rounded, () => context.push(AppRoutes.driverRoute)),
                          _buildQuickAction(context, 'Map', Icons.map_outlined, () => driverNotifier.setTabIndex(2)), 
                          _buildQuickAction(context, 'History', Icons.history_rounded, () => context.push(AppRoutes.driverHistory)),
                        ],
                      ),
                      
                      const SizedBox(height: 120),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildWhiteStat(String label, String value, IconData icon) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: Colors.white, size: 22),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
          Text(label, style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildEmptyState(String title, String subtitle, IconData icon) {
    return BinovaCard(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
      child: Center(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppTheme.softMint, shape: BoxShape.circle),
              child: Icon(icon, size: 40, color: AppTheme.primaryEmerald.withOpacity(0.4)),
            ),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.darkText, fontSize: 15)),
            const SizedBox(height: 6),
            Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.greyText, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickAction(BuildContext context, String title, IconData icon, VoidCallback onTap) {
    return BinovaCard(
      onTap: onTap,
      borderRadius: 24,
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primaryEmerald.withOpacity(0.1), AppTheme.accentMint.withOpacity(0.05)],
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppTheme.primaryEmerald, size: 30),
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.darkText)),
        ],
      ),
    );
  }
}
