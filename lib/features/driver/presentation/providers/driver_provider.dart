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

  String? _selectedTaskId;
  String? get selectedTaskId => _selectedTaskId;

  void selectTask(String? taskId) {
    _selectedTaskId = taskId;
    notifyListeners();
  }

  TaskEntity? get selectedTask {
    if (_selectedTaskId == null) return null;
    try {
      return _tasks.firstWhere((t) => t.id == _selectedTaskId);
    } catch (_) {
      return null;
    }
  }

  TaskEntity? get activeAiTask {
    if (_selectedTaskId != null) {
      final st = selectedTask;
      if (st != null && st.isAiOptimized && st.status != TaskStatus.completed) {
        return st;
      }
    }
    try {
      return _tasks.firstWhere(
        (t) => t.isAiOptimized && t.status != TaskStatus.completed,
      );
    } catch (_) {
      return null;
    }
  }

  /// Returns all active, uncompleted collection stops that strictly belong to
  /// confirmed collection tasks assigned to this authenticated driver.
  List<RouteStopEntity> get assignedActiveStops {
    final active = _tasks.where((t) => t.status != TaskStatus.completed).toList();
    if (active.isEmpty) return [];

    final List<RouteStopEntity> stops = [];
    final seenBinIds = <int>{};

    for (final task in active) {
      if (task.routeStops.isNotEmpty) {
        for (final stop in task.routeStops) {
          if (!stop.isCompleted && !seenBinIds.contains(stop.binId)) {
            seenBinIds.add(stop.binId);
            stops.add(stop);
          }
        }
      } else if (task.latitude != 0 && task.longitude != 0) {
        final bId = int.tryParse(task.binId) ?? 0;
        if (!seenBinIds.contains(bId)) {
          seenBinIds.add(bId);
          stops.add(RouteStopEntity(
            id: bId,
            binId: bId,
            binCode: task.binCode ?? 'BIN-$bId',
            address: task.location,
            latitude: task.latitude,
            longitude: task.longitude,
            fillLevel: task.fillLevel,
            capacity: 50.0,
            priority: task.priority,
            stopOrder: stops.length + 1,
            isCompleted: false,
          ));
        }
      }
    }

    // Number sequentially
    return stops.asMap().entries.map((e) {
      final idx = e.key;
      final s = e.value;
      if (s.stopOrder != idx + 1) {
        return RouteStopEntity(
          id: s.id,
          binId: s.binId,
          binCode: s.binCode,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
          fillLevel: s.fillLevel,
          capacity: s.capacity,
          priority: s.priority,
          stopOrder: idx + 1,
          isCompleted: s.isCompleted,
        );
      }
      return s;
    }).toList();
  }

  /// Exact pending stop count strictly from confirmed assigned active bins
  int get pendingStopsCount => assignedActiveStops.length;

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
