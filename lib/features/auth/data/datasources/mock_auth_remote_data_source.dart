import '../models/user_model.dart';
import 'auth_remote_data_source.dart';

class MockAuthRemoteDataSource implements AuthRemoteDataSource {
  UserModel? _currentUser;

  @override
  Future<UserModel> login(String email, String password) async {
    await Future.delayed(const Duration(seconds: 1));
    
    // Simple mock logic
    final role = email.toLowerCase().contains('driver') ? 'driver' : 'citizen';
    
    _currentUser = UserModel(
      uid: 'mock_uid_123',
      fullName: 'Mock User',
      email: email,
      phone: '123456789',
      role: role,
      createdAt: DateTime.now(),
      profileImage: '',
      status: 'active',
    );
    
    return _currentUser!;
  }

  @override
  Future<UserModel> register(UserModel user, String password) async {
    await Future.delayed(const Duration(seconds: 1));
    _currentUser = UserModel(
      uid: 'mock_uid_reg',
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: 'citizen',
      createdAt: DateTime.now(),
      profileImage: '',
      status: 'active',
    );
    return _currentUser!;
  }

  @override
  Future<void> logout() async {
    _currentUser = null;
  }

  @override
  Future<void> resetPassword(String email) async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  @override
  Future<UserModel?> getCurrentUser() async {
    return _currentUser;
  }

  @override
  Stream<UserModel?> get userStream => Stream.value(_currentUser);
}
