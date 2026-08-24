import '../entities/task_entity.dart';
import '../entities/truck_entity.dart';

abstract class DriverRepository {
  Future<List<TaskEntity>> getAssignedTasks();
  Future<void> updateTaskStatus(String taskId, TaskStatus status);
  Future<TruckEntity?> getAssignedTruck();
  Stream<List<TaskEntity>> get tasksStream;
}
