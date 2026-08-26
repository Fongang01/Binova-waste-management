import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';
import '../../features/driver/domain/entities/task_entity.dart';
import '../../widgets/binova_card.dart';

class DriverHistoryScreen extends StatelessWidget {
  const DriverHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final driverNotifier = context.watch<DriverNotifier>();
    final completedTasks = driverNotifier.tasks.where((t) => t.status == TaskStatus.completed).toList();

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
        child: completedTasks.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(color: AppTheme.primaryEmerald.withAlpha(25), blurRadius: 40)
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
              )
            : ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: completedTasks.length,
                itemBuilder: (context, index) {
                  final task = completedTasks[index];
                  final formattedDate = DateFormat('MMM d, yyyy • HH:mm').format(task.assignedTime);

                  return BinovaCard(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(18),
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
                                  decoration: BoxDecoration(
                                    color: Colors.green.withAlpha(25),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.check_circle_rounded, color: Colors.green, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Text('Bin: ${task.binId}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.green.withAlpha(25),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text('COLLECTED', style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.w800)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.location_on_rounded, color: AppTheme.greyText, size: 16),
                            const SizedBox(width: 4),
                            Expanded(child: Text(task.location, style: const TextStyle(color: AppTheme.greyText, fontSize: 13))),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.access_time_rounded, color: AppTheme.greyText, size: 14),
                            const SizedBox(width: 4),
                            Text(formattedDate, style: const TextStyle(color: AppTheme.greyText, fontSize: 11)),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}
