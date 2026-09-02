import 'package:flutter/material.dart';
import '../../domain/entities/task_entity.dart';
import '../../domain/entities/truck_entity.dart';
import '../../domain/usecases/get_assigned_tasks_usecase.dart';
import '../../domain/usecases/get_assigned_truck_usecase.dart';
import '../../domain/usecases/update_task_status_usecase.dart';
import '../../../../core/usecases/usecase.dart';

class DriverNotifier extends ChangeNotifier {
  final GetAssignedTasksUseCase getAssignedTasksUseCase;
  final GetAssignedTruckUseCase getAssignedTruckUseCase;
  final UpdateTaskStatusUseCase updateTaskStatusUseCase;

  DriverNotifier({
    required this.getAssignedTasksUseCase,
    required this.getAssignedTruckUseCase,
    required this.updateTaskStatusUseCase,
  });

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  int _currentTabIndex = 0;
  int get currentTabIndex => _currentTabIndex;

  List<TaskEntity> _tasks = [];
  List<TaskEntity> get tasks => _tasks;

  TruckEntity? _assignedTruck;
  TruckEntity? get assignedTruck => _assignedTruck;

  void setTabIndex(int index) {
    _currentTabIndex = index;
    notifyListeners();
  }

  Future<void> loadDashboardData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final tasksResult = await getAssignedTasksUseCase(NoParams());
      final truckResult = await getAssignedTruckUseCase(NoParams());
      
      _tasks = tasksResult;
      _assignedTruck = truckResult;
    } catch (e) {
      debugPrint('Error loading dashboard data: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  TaskEntity? get activeAiTask {
    try {
      return _tasks.firstWhere(
        (t) => t.isAiOptimized && t.status != TaskStatus.completed,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> updateStatus(String taskId, TaskStatus status) async {
    try {
      await updateTaskStatusUseCase(UpdateTaskStatusParams(taskId: taskId, status: status));
      await loadDashboardData();
    } catch (e) {
      debugPrint('Error updating task status: $e');
    }
  }

  Future<void> completeStop(String taskId, int stopId) async {
    try {
      await updateTaskStatusUseCase.completeStop(taskId, stopId);
      await loadDashboardData();
    } catch (e) {
      debugPrint('Error completing stop: $e');
    }
  }
}
