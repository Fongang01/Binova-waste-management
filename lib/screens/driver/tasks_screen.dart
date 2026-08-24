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
        return BinovaCard(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: AppTheme.primaryEmerald.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.delete_sweep_rounded, color: AppTheme.primaryEmerald, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Text('Bin: ${task.binId}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    ],
                  ),
                  _buildPriorityBadge(task.priority),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on_rounded, color: AppTheme.greyText, size: 16),
                  const SizedBox(width: 4),
                  Expanded(child: Text(task.location, style: const TextStyle(color: AppTheme.greyText, fontSize: 13, height: 1.4))),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Divider(height: 1, color: Color(0xFFF0F0F0)),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                   Column(
                     crossAxisAlignment: CrossAxisAlignment.start,
                     children: [
                       const Text('Fill Level', style: TextStyle(color: AppTheme.greyText, fontSize: 11, fontWeight: FontWeight.w600)),
                       Text('${task.fillLevel}%', style: TextStyle(
                         color: task.fillLevel > 80 ? Colors.red : AppTheme.primaryEmerald,
                         fontWeight: FontWeight.w900,
                         fontSize: 18,
                       )),
                     ],
                   ),
                   ElevatedButton(
                     onPressed: () {},
                     style: ElevatedButton.styleFrom(
                       backgroundColor: AppTheme.primaryEmerald,
                       foregroundColor: Colors.white,
                       elevation: 0,
                       padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 0),
                       minimumSize: const Size(0, 44),
                       shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                     ),
                     child: const Text('Update Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                   ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPriorityBadge(TaskPriority priority) {
    Color color = Colors.green;
    if (priority == TaskPriority.urgent) color = Colors.red;
    if (priority == TaskPriority.high) color = Colors.orange;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        priority.name.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5),
      ),
    );
  }
}
