import '../../../../core/usecases/usecase.dart';
import '../entities/task_entity.dart';
import '../repositories/driver_repository.dart';

class GetAssignedTasksUseCase implements UseCase<List<TaskEntity>, NoParams> {
  final DriverRepository repository;

  GetAssignedTasksUseCase(this.repository);

  @override
  Future<List<TaskEntity>> call(NoParams params) {
    return repository.getAssignedTasks();
  }
}
