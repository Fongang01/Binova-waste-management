import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/routes/app_routes.dart';
import '../../core/theme/app_theme.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';
import '../../features/driver/domain/entities/task_entity.dart';
import '../../widgets/binova_card.dart';

class DriverRouteScreen extends StatelessWidget {
  const DriverRouteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final driverNotifier = context.watch<DriverNotifier>();
    final aiTask = driverNotifier.activeAiTask;
    final activeTasks = driverNotifier.tasks
        .where((t) => t.status != TaskStatus.completed)
        .toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Optimized Route', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.darkText, size: 20),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              context.go(AppRoutes.driverDashboard);
            }
          },
        ),
      ),
      bottomNavigationBar: (aiTask != null || activeTasks.isNotEmpty)
          ? Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SafeArea(
                child: ElevatedButton.icon(
                  onPressed: () {
                    driverNotifier.setTabIndex(2); // Map Tab
                    if (Navigator.of(context).canPop()) {
                      Navigator.of(context).pop();
                    } else {
                      context.go(AppRoutes.driverDashboard);
                    }
                  },
                  icon: const Icon(Icons.map_rounded, color: Colors.white),
                  label: const Text(
                    'View Route on Map',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryEmerald,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                  ),
                ),
              ),
            )
          : null,
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(gradient: AppTheme.bgGradient),
        child: aiTask != null
            ? _buildAiRouteView(context, aiTask, driverNotifier)
            : (activeTasks.isNotEmpty
                ? _buildStandardTasksView(context, activeTasks, driverNotifier)
                : _buildEmptyState()),
      ),
    );
  }

  Widget _buildAiRouteView(BuildContext context, TaskEntity task, DriverNotifier notifier) {
    final stops = task.routeStops;
    final totalDistance = task.distanceKm ?? 0.0;
    final totalDuration = task.estimatedDuration ?? 0;

    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        // AI Route Header Card
        BinovaCard(
          useGlass: true,
          padding: const EdgeInsets.all(20),
          border: Border.all(color: AppTheme.primaryEmerald.withOpacity(0.2)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'AI OPTIMIZED ROUTE',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                        color: AppTheme.primaryEmerald,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryEmerald.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${task.pendingStopsCount} of ${task.totalStops} Pending',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primaryEmerald,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _buildMetricItem('STOPS', '${task.totalStops}', Icons.pin_drop_rounded),
                  _buildMetricDivider(),
                  _buildMetricItem('DISTANCE', '${totalDistance.toStringAsFixed(1)} km', Icons.route_rounded),
                  _buildMetricDivider(),
                  _buildMetricItem('EST. TIME', '$totalDuration min', Icons.schedule_rounded),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Ordered Collection Stops',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.darkText),
            ),
            Text(
              '${task.completedStopsCount}/${task.totalStops} Completed',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Stops List
        if (stops.isNotEmpty)
          ...stops.map((stop) => _buildStopCard(context, stop, task, notifier))
        else
          // Fallback if stops list not populated
          _buildSingleStopFallback(task),

        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildStopCard(BuildContext context, RouteStopEntity stop, TaskEntity task, DriverNotifier notifier) {
    final isCompleted = stop.isCompleted;
    final isNext = !isCompleted && (task.currentStop?.id == stop.id);

    Color priorityColor;
    String priorityText;
    switch (stop.priority) {
      case TaskPriority.urgent:
        priorityColor = Colors.red.shade600;
        priorityText = 'CRITICAL';
        break;
      case TaskPriority.high:
        priorityColor = Colors.orange.shade700;
        priorityText = 'HIGH';
        break;
      case TaskPriority.medium:
        priorityColor = AppTheme.primaryEmerald;
        priorityText = 'NORMAL';
        break;
      case TaskPriority.low:
        priorityColor = Colors.blue.shade600;
        priorityText = 'LOW';
        break;
    }

    return BinovaCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      border: isNext
          ? Border.all(color: AppTheme.primaryEmerald, width: 2)
          : (isCompleted
              ? Border.all(color: Colors.grey.shade200)
              : Border.all(color: Colors.grey.shade100)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Stop Number Pin
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              gradient: isCompleted
                  ? null
                  : (isNext ? AppTheme.primaryGradient : null),
              color: isCompleted
                  ? Colors.grey.shade200
                  : (isNext ? null : AppTheme.softMint),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: isCompleted
                  ? const Icon(Icons.check_rounded, color: Colors.green, size: 20)
                  : Text(
                      '${stop.stopOrder}',
                      style: TextStyle(
                        color: isNext ? Colors.white : AppTheme.primaryEmerald,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 14),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      stop.binCode,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        decoration: isCompleted ? TextDecoration.lineThrough : null,
                        color: isCompleted ? Colors.grey.shade500 : AppTheme.darkText,
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          '${stop.fillLevel}%',
                          style: TextStyle(
                            color: isCompleted
                                ? Colors.grey.shade400
                                : (stop.fillLevel >= 80 ? Colors.red.shade600 : AppTheme.primaryEmerald),
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: priorityColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            priorityText,
                            style: TextStyle(
                              color: priorityColor,
                              fontWeight: FontWeight.w800,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  stop.address,
                  style: TextStyle(
                    color: isCompleted ? Colors.grey.shade400 : AppTheme.greyText,
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (isNext) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryEmerald.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      '★ NEXT STOP TO COLLECT',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primaryEmerald,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSingleStopFallback(TaskEntity task) {
    return BinovaCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Text('1', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Bin ${task.binId}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 4),
                Text(task.location, style: const TextStyle(color: AppTheme.greyText, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStandardTasksView(BuildContext context, List<TaskEntity> tasks, DriverNotifier notifier) {
    return ListView.builder(
      padding: const EdgeInsets.all(18),
      itemCount: tasks.length,
      itemBuilder: (context, index) {
        final task = tasks[index];
        final isNext = index == 0;

        return BinovaCard(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  gradient: isNext ? AppTheme.primaryGradient : null,
                  color: isNext ? null : AppTheme.softMint,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: TextStyle(
                      color: isNext ? Colors.white : AppTheme.primaryEmerald,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Bin ${task.binId}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        Text(
                          '${task.fillLevel}% Full',
                          style: TextStyle(
                            color: task.fillLevel > 80 ? Colors.red : AppTheme.primaryEmerald,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(task.location, style: const TextStyle(color: AppTheme.greyText, fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: AppTheme.primaryEmerald.withOpacity(0.15), blurRadius: 30)
              ],
            ),
            child: const Icon(Icons.alt_route_rounded, size: 60, color: AppTheme.primaryEmerald),
          ),
          const SizedBox(height: 24),
          const Text(
            'No Active Route',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.darkText),
          ),
          const SizedBox(height: 10),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Your AI-optimized collection route will appear here once approved and assigned by an administrator.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.greyText, height: 1.5, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(String label, String value, IconData icon) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 18, color: AppTheme.primaryEmerald),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.darkText),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.greyText),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricDivider() {
    return Container(
      height: 30,
      width: 1,
      color: Colors.grey.shade200,
    );
  }
}
