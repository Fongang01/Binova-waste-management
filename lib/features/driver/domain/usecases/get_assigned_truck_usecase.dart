import '../../../../core/usecases/usecase.dart';
import '../entities/truck_entity.dart';
import '../repositories/driver_repository.dart';

class GetAssignedTruckUseCase implements UseCase<TruckEntity?, NoParams> {
  final DriverRepository repository;

  GetAssignedTruckUseCase(this.repository);

  @override
  Future<TruckEntity?> call(NoParams params) {
    return repository.getAssignedTruck();
  }
}
