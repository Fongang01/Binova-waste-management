import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';
import '../../features/driver/domain/entities/task_entity.dart';
import '../../widgets/binova_card.dart';

class DriverTasksScreen extends StatelessWidget {
  const DriverTasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final driverNotifier = context.watch<DriverNotifier>();

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          title: const Text('My Tasks', style: TextStyle(fontWeight: FontWeight.bold)),
          bottom: TabBar(
            labelColor: AppTheme.primaryEmerald,
            unselectedLabelColor: AppTheme.greyText,
            indicatorColor: AppTheme.primaryEmerald,
            indicatorWeight: 4,
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
            tabs: [
              Tab(text: 'Pending (${driverNotifier.tasks.where((t) => t.status == TaskStatus.assigned || t.status == TaskStatus.accepted).length})'),
              Tab(text: 'Active (${driverNotifier.tasks.where((t) => t.status == TaskStatus.inProgress).length})'),
              Tab(text: 'History (${driverNotifier.tasks.where((t) => t.status == TaskStatus.completed).length})'),
            ],
          ),
        ),
        body: Container(
          decoration: BoxDecoration(gradient: AppTheme.bgGradient),
          child: driverNotifier.isLoading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryEmerald))
              : TabBarView(
                  children: [
                    _TasksList(tasks: driverNotifier.tasks.where((t) => t.status == TaskStatus.assigned || t.status == TaskStatus.accepted).toList()),
                    _TasksList(tasks: driverNotifier.tasks.where((t) => t.status == TaskStatus.inProgress).toList()),
                    _TasksList(tasks: driverNotifier.tasks.where((t) => t.status == TaskStatus.completed).toList()),
                  ],
                ),
        ),
      ),
    );
  }
}

class _TasksList extends StatelessWidget {
  final List<TaskEntity> tasks;

  const _TasksList({required this.tasks});

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: AppTheme.softMint, shape: BoxShape.circle),
              child: Icon(Icons.assignment_turned_in_outlined, size: 64, color: AppTheme.primaryEmerald.withOpacity(0.3)),
            ),
            const SizedBox(height: 24),
            const Text('No tasks here yet.', style: TextStyle(color: AppTheme.greyText, fontWeight: FontWeight.w500)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: tasks.length,
      itemBuilder: (context, index) {
        final task = tasks[index];
        final isAi = task.isAiOptimized;

        return BinovaCard(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          border: isAi ? Border.all(color: AppTheme.primaryEmerald.withOpacity(0.2)) : null,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Tag / AI Badge
              if (isAi)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryEmerald.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.auto_awesome_rounded, size: 14, color: AppTheme.primaryEmerald),
                      const SizedBox(width: 6),
                      Text(
                        'AI MULTI-STOP ROUTE (${task.pendingStopsCount}/${task.totalStops} PENDING)',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          color: AppTheme.primaryEmerald,
                        ),
                      ),
                    ],
                  ),
                ),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryEmerald.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          isAi ? Icons.alt_route_rounded : Icons.delete_sweep_rounded,
                          color: AppTheme.primaryEmerald,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        isAi
                            ? (task.currentStop != null ? 'Stop #${task.currentStopNumber}: ${task.currentStop!.binCode}' : 'Route: ${task.totalStops} Stops')
                            : 'Bin: ${task.binId}',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                    ],
                  ),
                  _buildPriorityBadge(isAi && task.currentStop != null ? task.currentStop!.priority : task.priority),
                ],
              ),
              const SizedBox(height: 14),

              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on_rounded, color: AppTheme.greyText, size: 16),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      isAi && task.currentStop != null ? task.currentStop!.address : task.location,
                      style: const TextStyle(color: AppTheme.greyText, fontSize: 13, height: 1.4),
                    ),
                  ),
                ],
              ),

              if (isAi) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.route_rounded, size: 14, color: AppTheme.primaryEmerald),
                    const SizedBox(width: 4),
                    Text(
                      '${task.distanceKm ?? 0} km • Est. ${task.estimatedDuration ?? 0} min total',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],

              const Padding(
                padding: EdgeInsets.symmetric(vertical: 14),
                child: Divider(height: 1, color: Color(0xFFF0F0F0)),
              ),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isAi ? 'Current Fill Level' : 'Fill Level',
                        style: const TextStyle(color: AppTheme.greyText, fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        '${isAi && task.currentStop != null ? task.currentStop!.fillLevel : task.fillLevel}%',
                        style: TextStyle(
                          color: (isAi && task.currentStop != null ? task.currentStop!.fillLevel : task.fillLevel) > 80
                              ? Colors.red
                              : AppTheme.primaryEmerald,
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      if (isAi && task.status != TaskStatus.completed)
                        IconButton(
                          icon: const Icon(Icons.map_rounded, color: AppTheme.primaryEmerald),
                          tooltip: 'View on Map',
                          onPressed: () {
                            context.read<DriverNotifier>().setTabIndex(2);
                          },
                        ),
                      const SizedBox(width: 4),
                      _buildActionButton(context, task),
                    ],
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActionButton(BuildContext context, TaskEntity task) {
    if (task.status == TaskStatus.completed) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.green.withAlpha(25),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.green.withAlpha(50)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle_rounded, color: Colors.green, size: 16),
            SizedBox(width: 6),
            Text('Completed', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
      );
    }

    final isAi = task.isAiOptimized;
    final isAssigned = task.status == TaskStatus.assigned || task.status == TaskStatus.accepted;

    String buttonLabel = 'Start Task';
    if (isAssigned) {
      buttonLabel = isAi ? 'Start Route' : 'Start Task';
    } else {
      buttonLabel = isAi && task.currentStop != null ? 'Complete Stop #${task.currentStopNumber}' : 'Complete';
    }

    final buttonColor = isAssigned ? AppTheme.primaryEmerald : const Color(0xFF2563EB);

    return ElevatedButton(
      onPressed: () async {
        final driverNotifier = context.read<DriverNotifier>();
        if (isAssigned) {
          await driverNotifier.updateStatus(task.id, TaskStatus.inProgress);
        } else {
          if (isAi && task.currentStop != null) {
            await driverNotifier.completeStop(task.id, task.currentStop!.id);
          } else {
            await driverNotifier.updateStatus(task.id, TaskStatus.completed);
          }
        }
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: buttonColor,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
        minimumSize: const Size(0, 42),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(isAssigned ? Icons.play_arrow_rounded : Icons.check_circle_outline_rounded, size: 18),
          const SizedBox(width: 6),
          Text(buttonLabel, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildPriorityBadge(TaskPriority priority) {
    Color color = Colors.green;
    if (priority == TaskPriority.urgent) color = Colors.red;
    if (priority == TaskPriority.high) color = Colors.orange;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        priority.name.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5),
      ),
    );
  }
}
