import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_data_source.dart';
import '../models/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;

  AuthRepositoryImpl({required this.remoteDataSource});

  @override
  Future<UserEntity> login(String email, String password) => remoteDataSource.login(email, password);

  @override
  Future<UserEntity> register(UserEntity user, String password) =>
      remoteDataSource.register(UserModel.fromEntity(user), password);

  @override
  Future<void> logout() => remoteDataSource.logout();

  @override
  Future<void> resetPassword(String email) => remoteDataSource.resetPassword(email);

  @override
  Future<UserEntity?> getCurrentUser() => remoteDataSource.getCurrentUser();

  @override
  Stream<UserEntity?> get userStream => remoteDataSource.userStream;
}
