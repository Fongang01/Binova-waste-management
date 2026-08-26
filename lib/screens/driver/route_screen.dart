import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';
import '../../features/driver/domain/entities/task_entity.dart';
import '../../widgets/binova_card.dart';

class DriverRouteScreen extends StatelessWidget {
  const DriverRouteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final driverNotifier = context.watch<DriverNotifier>();
    final activeTasks = driverNotifier.tasks.where((t) => t.status != TaskStatus.completed).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Optimized Route', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(gradient: AppTheme.bgGradient),
        child: activeTasks.isEmpty
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
                      child: const Icon(Icons.alt_route_rounded, size: 64, color: AppTheme.primaryEmerald),
                    ),
                    const SizedBox(height: 32),
                    const Text(
                      'Route Planning',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.darkText),
                    ),
                    const SizedBox(height: 16),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 50),
                      child: Text(
                        'Your AI-optimized collection route will appear here once a task is assigned.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppTheme.greyText, height: 1.6, fontSize: 14),
                      ),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: activeTasks.length,
                itemBuilder: (context, index) {
                  final task = activeTasks[index];
                  final isNext = index == 0;

                  return BinovaCard(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(18),
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
                                  Text('${task.fillLevel}% Full', style: TextStyle(
                                    color: task.fillLevel > 80 ? Colors.red : AppTheme.primaryEmerald,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  )),
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
              ),
      ),
    );
  }
}
