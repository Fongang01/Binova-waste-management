import '../models/task_model.dart';
import '../models/truck_model.dart';
import '../../domain/entities/task_entity.dart';

abstract class DriverRemoteDataSource {
  Future<List<TaskModel>> getAssignedTasks();
  Future<void> updateTaskStatus(String taskId, TaskStatus status);
  Future<TruckModel?> getAssignedTruck();
  Stream<List<TaskModel>> get tasksStream;
}

class DriverRemoteDataSourceImpl implements DriverRemoteDataSource {
  // TODO: Implement with Firebase Firestore
  @override
  Future<List<TaskModel>> getAssignedTasks() async => [];
  
  @override
  Future<void> updateTaskStatus(String taskId, TaskStatus status) async {}

  @override
  Future<TruckModel?> getAssignedTruck() async => null;

  @override
  Stream<List<TaskModel>> get tasksStream => Stream.value([]);
}

class MockDriverRemoteDataSource implements DriverRemoteDataSource {
  @override
  Future<List<TaskModel>> getAssignedTasks() async {
    await Future.delayed(const Duration(seconds: 1));
    return []; // Start with empty as per instructions
  }

  @override
  Future<void> updateTaskStatus(String taskId, TaskStatus status) async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  @override
  Future<TruckModel?> getAssignedTruck() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return null; // Start with empty as per instructions
  }

  @override
  Stream<List<TaskModel>> get tasksStream => Stream.value([]);
}
