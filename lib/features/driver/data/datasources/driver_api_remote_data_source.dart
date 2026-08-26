import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/task_entity.dart';
import '../models/task_model.dart';
import '../models/truck_model.dart';
import 'driver_remote_data_source.dart';

class DriverApiRemoteDataSource implements DriverRemoteDataSource {
  final ApiClient _client = ApiClient();

  @override
  Future<List<TaskModel>> getAssignedTasks() async {
    try {
      final resp = await _client.dio.get('/api/driver/tasks');
      final data = resp.data;
      if (data == null || data['success'] != true) return [];
      final items =
          (data['data'] as List<dynamic>).cast<Map<String, dynamic>>();
      return items.map((e) => TaskModel.fromApi(e)).toList();
    } on DioException catch (e) {
      final msg = e.response?.data is Map ? e.response?.data['message'] : null;
      throw Exception(msg ?? e.message ?? 'Failed to get tasks');
    }
  }

  @override
  Future<void> updateTaskStatus(String taskId, TaskStatus status) async {
    try {
      final statusStr = _toBackendStatus(status);
      await _client.dio.patch(
        '/api/driver/tasks/$taskId/status',
        data: {'status': statusStr},
      );
    } on DioException catch (e) {
      final msg = e.response?.data is Map ? e.response?.data['message'] : null;
      throw Exception(msg ?? e.message ?? 'Failed to update task status');
    }
  }

  @override
  Future<TruckModel?> getAssignedTruck() async {
    try {
      final resp = await _client.dio.get('/api/driver/tasks/truck');
      final data = resp.data;
      if (data != null && data['success'] == true && data['data'] != null) {
        return TruckModel.fromApi(Map<String, dynamic>.from(data['data']));
      }
      // Fallback: derive from assigned tasks
      final tasks = await getAssignedTasks();
      for (final t in tasks) {
        if (t.truck != null) return t.truck;
      }
      return null;
    } catch (_) {
      try {
        final tasks = await getAssignedTasks();
        for (final t in tasks) {
          if (t.truck != null) return t.truck;
        }
      } catch (_) {}
      return null;
    }
  }

  @override
  Stream<List<TaskModel>> get tasksStream async* {
    final tasks = await getAssignedTasks();
    yield tasks;
  }

  String _toBackendStatus(TaskStatus s) {
    switch (s) {
      case TaskStatus.assigned:
        return 'ASSIGNED';
      case TaskStatus.inProgress:
        return 'IN_PROGRESS';
      case TaskStatus.completed:
        return 'COMPLETED';
      default:
        return 'ASSIGNED';
    }
  }
}
