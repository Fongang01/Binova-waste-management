import '../../../../core/usecases/usecase.dart';
import '../entities/user_entity.dart';
import '../repositories/auth_repository.dart';

class RegisterUseCase implements UseCase<UserEntity, RegisterParams> {
  final AuthRepository repository;

  RegisterUseCase(this.repository);

  @override
  Future<UserEntity> call(RegisterParams params) {
    return repository.register(params.user, params.password);
  }
}

class RegisterParams {
  final UserEntity user;
  final String password;

  RegisterParams({required this.user, required this.password});
}
