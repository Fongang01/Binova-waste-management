import '../../domain/entities/task_entity.dart';
import '../../domain/entities/truck_entity.dart';
import '../../domain/repositories/driver_repository.dart';
import '../datasources/driver_remote_data_source.dart';

class DriverRepositoryImpl implements DriverRepository {
  final DriverRemoteDataSource remoteDataSource;

  DriverRepositoryImpl({required this.remoteDataSource});

  @override
  Future<List<TaskEntity>> getAssignedTasks() => remoteDataSource.getAssignedTasks();

  @override
  Future<void> updateTaskStatus(String taskId, TaskStatus status) =>
      remoteDataSource.updateTaskStatus(taskId, status);

  @override
  Future<TruckEntity?> getAssignedTruck() => remoteDataSource.getAssignedTruck();

  @override
  Stream<List<TaskEntity>> get tasksStream => remoteDataSource.tasksStream;
}
