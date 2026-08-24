import '../../../../core/usecases/usecase.dart';
import '../entities/task_entity.dart';
import '../repositories/driver_repository.dart';

class UpdateTaskStatusUseCase implements UseCase<void, UpdateTaskStatusParams> {
  final DriverRepository repository;

  UpdateTaskStatusUseCase(this.repository);

  @override
  Future<void> call(UpdateTaskStatusParams params) {
    return repository.updateTaskStatus(params.taskId, params.status);
  }
}

class UpdateTaskStatusParams {
  final String taskId;
  final TaskStatus status;

  UpdateTaskStatusParams({required this.taskId, required this.status});
}
