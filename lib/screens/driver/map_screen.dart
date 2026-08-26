import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../features/driver/domain/entities/task_entity.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';

class DriverMapScreen extends StatefulWidget {
  const DriverMapScreen({super.key});

  @override
  State<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends State<DriverMapScreen> {
  GoogleMapController? _controller;
  TaskEntity? _selectedTask;

  @override
  Widget build(BuildContext context) {
    final driverNotifier = context.watch<DriverNotifier>();
    final activeTasks = driverNotifier.tasks
        .where((t) => t.status != TaskStatus.completed)
        .toList();

    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: const CameraPosition(
              target: LatLng(4.0511, 9.7679), // Douala Default Coordinates
              zoom: 13,
            ),
            onMapCreated: (controller) {
              _controller = controller;
              _fitBoundsIfTasksExist(activeTasks);
            },
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            markers: _buildMarkers(activeTasks),
            onTap: (_) {
              if (_selectedTask != null) {
                setState(() => _selectedTask = null);
              }
            },
          ),

          // TOP BAR: Menu & Quick Stats
          Positioned(
            top: 50,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Builder(
                  builder: (ctx) => FloatingActionButton.small(
                    heroTag: 'map_menu',
                    onPressed: () => Scaffold.of(ctx).openDrawer(),
                    backgroundColor: Colors.white,
                    elevation: 4,
                    child: const Icon(Icons.menu_rounded, color: AppTheme.darkText),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppTheme.primaryGreen,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${activeTasks.length} Active Task${activeTasks.length == 1 ? '' : 's'}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                FloatingActionButton.small(
                  heroTag: 'map_refresh',
                  onPressed: () async {
                    await driverNotifier.loadDashboardData();
                    _fitBoundsIfTasksExist(driverNotifier.tasks);
                  },
                  backgroundColor: Colors.white,
                  elevation: 4,
                  child: const Icon(Icons.refresh_rounded, color: AppTheme.primaryGreen),
                ),
              ],
            ),
          ),

          // EMPTY STATE BANNER
          if (activeTasks.isEmpty && !driverNotifier.isLoading)
            Positioned(
              bottom: 40,
              left: 20,
              right: 20,
              child: Card(
                elevation: 6,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Row(
                    children: [
                      Icon(Icons.check_circle_outline, color: AppTheme.primaryGreen, size: 28),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'All Collections Completed',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            Text(
                              'No pending collection tasks currently assigned.',
                              style: TextStyle(color: AppTheme.greyText, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // SELECTED TASK DETAILS CARD (BOTTOM SHEET OVERLAY)
          if (_selectedTask != null)
            Positioned(
              bottom: 24,
              left: 16,
              right: 16,
              child: _buildTaskDetailsCard(_selectedTask!, driverNotifier),
            ),
        ],
      ),
    );
  }

  void _fitBoundsIfTasksExist(List<TaskEntity> tasks) {
    if (tasks.isEmpty || _controller == null) return;

    final validTasks = tasks.where((t) => t.latitude != 0 && t.longitude != 0).toList();
    if (validTasks.isEmpty) return;

    if (validTasks.length == 1) {
      final t = validTasks.first;
      _controller?.animateCamera(
        CameraUpdate.newLatLngZoom(LatLng(t.latitude, t.longitude), 15),
      );
      return;
    }

    double minLat = validTasks.first.latitude;
    double maxLat = validTasks.first.latitude;
    double minLng = validTasks.first.longitude;
    double maxLng = validTasks.first.longitude;

    for (final t in validTasks) {
      if (t.latitude < minLat) minLat = t.latitude;
      if (t.latitude > maxLat) maxLat = t.latitude;
      if (t.longitude < minLng) minLng = t.longitude;
      if (t.longitude > maxLng) maxLng = t.longitude;
    }

    _controller?.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat, minLng),
          northeast: LatLng(maxLat, maxLng),
        ),
        60,
      ),
    );
  }

  Set<Marker> _buildMarkers(List<TaskEntity> tasks) {
    return tasks
        .where((task) => task.latitude != 0 && task.longitude != 0)
        .map((task) {
      final isCritical = task.fillLevel >= 80;
      return Marker(
        markerId: MarkerId(task.id),
        position: LatLng(task.latitude, task.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(
          isCritical ? BitmapDescriptor.hueRed : BitmapDescriptor.hueGreen,
        ),
        onTap: () {
          setState(() => _selectedTask = task);
          _controller?.animateCamera(
            CameraUpdate.newLatLngZoom(LatLng(task.latitude, task.longitude), 15.5),
          );
        },
      );
    }).toSet();
  }

  Widget _buildTaskDetailsCard(TaskEntity task, DriverNotifier notifier) {
    final isCritical = task.fillLevel >= 80;
    final fillPercent = (task.fillLevel / 100.0).clamp(0.0, 1.0);

    return Card(
      elevation: 8,
      shadowColor: Colors.black26,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isCritical ? Colors.red.shade50 : Colors.green.shade50,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Icons.delete_outline_rounded,
                        color: isCritical ? Colors.red : AppTheme.primaryGreen,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Bin ${task.binId}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Text(
                          'Task #${task.id}',
                          style: const TextStyle(color: AppTheme.greyText, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTheme.greyText, size: 20),
                  onPressed: () => setState(() => _selectedTask = null),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 16, color: AppTheme.greyText),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    task.location.isNotEmpty ? task.location : 'Assigned Collection Location',
                    style: const TextStyle(color: AppTheme.darkText, fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // FILL LEVEL BAR
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Bin Fill Level:', style: TextStyle(fontSize: 12, color: AppTheme.greyText)),
                Text(
                  '${task.fillLevel}% ${isCritical ? "(CRITICAL)" : "Full"}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: isCritical ? Colors.red : AppTheme.primaryGreen,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: fillPercent,
                minHeight: 8,
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(
                  isCritical ? Colors.red : AppTheme.primaryGreen,
                ),
              ),
            ),

            const SizedBox(height: 18),

            // ACTION BUTTON
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: task.status == TaskStatus.inProgress
                      ? Colors.teal
                      : AppTheme.primaryGreen,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: Icon(
                  task.status == TaskStatus.inProgress
                      ? Icons.check_circle_outline
                      : Icons.play_arrow_rounded,
                  color: Colors.white,
                  size: 20,
                ),
                label: Text(
                  task.status == TaskStatus.inProgress
                      ? 'Mark as Emptied & Complete'
                      : 'Start Collection Route',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                ),
                onPressed: () async {
                  if (task.status == TaskStatus.inProgress) {
                    await notifier.updateStatus(task.id, TaskStatus.completed);
                    setState(() => _selectedTask = null);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Collection completed successfully!')),
                      );
                    }
                  } else {
                    await notifier.updateStatus(task.id, TaskStatus.inProgress);
                    setState(() {
                      _selectedTask = TaskEntity(
                        id: task.id,
                        binId: task.binId,
                        location: task.location,
                        latitude: task.latitude,
                        longitude: task.longitude,
                        fillLevel: task.fillLevel,
                        priority: task.priority,
                        status: TaskStatus.inProgress,
                        assignedTime: task.assignedTime,
                      );
                    });
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Collection route started!')),
                      );
                    }
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

