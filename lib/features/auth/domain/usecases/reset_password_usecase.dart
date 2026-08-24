import '../../../../core/usecases/usecase.dart';
import '../repositories/auth_repository.dart';

class ResetPasswordUseCase implements UseCase<void, String> {
  final AuthRepository repository;

  ResetPasswordUseCase(this.repository);

  @override
  Future<void> call(String email) {
    return repository.resetPassword(email);
  }
}
