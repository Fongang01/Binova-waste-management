import '../entities/user_entity.dart';

abstract class AuthRepository {
  Future<UserEntity> login(String email, String password);
  Future<UserEntity> register(UserEntity user, String password);
  Future<void> logout();
  Future<void> resetPassword(String email);
  Future<UserEntity?> getCurrentUser();
  Stream<UserEntity?> get userStream;
}
