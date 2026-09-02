import '../entities/task_entity.dart';
import '../entities/truck_entity.dart';

abstract class DriverRepository {
  Future<List<TaskEntity>> getAssignedTasks();
  Future<void> updateTaskStatus(String taskId, TaskStatus status);
  Future<void> completeStop(String taskId, int stopId);
  Future<TruckEntity?> getAssignedTruck();
  Stream<List<TaskEntity>> get tasksStream;
}
