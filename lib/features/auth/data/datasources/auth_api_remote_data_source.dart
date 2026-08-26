import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../models/user_model.dart';
import 'auth_remote_data_source.dart';

class AuthApiRemoteDataSource implements AuthRemoteDataSource {
  final ApiClient _client = ApiClient();

  @override
  Future<UserModel> login(String email, String password) async {
    try {
      final resp = await _client.dio.post(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );
      final data = resp.data;
      if (data == null || data['success'] != true)
        throw Exception(data?['message'] ?? 'Login failed');

      final token = data['token'] as String;
      final userMap = data['user'] as Map<String, dynamic>;

      final user = UserModel.fromApi(userMap);

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', token);
      await prefs.setString('auth_user', jsonEncode(userMap));

      return user;
    } on DioException catch (e) {
      final msg = e.response?.data is Map ? e.response?.data['message'] : null;
      throw Exception(msg ?? e.message ?? 'Login failed');
    }
  }

  @override
  Future<UserModel> register(UserModel user, String password) async {
    throw UnimplementedError('Registration is not supported for driver app');
  }

  @override
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user');
  }

  @override
  Future<void> resetPassword(String email) async {
    // Backend does not support mobile password reset endpoint currently
    throw UnimplementedError('Reset password not implemented');
  }

  @override
  Future<UserModel?> getCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('auth_user');
    if (userJson == null) return null;
    final map = jsonDecode(userJson) as Map<String, dynamic>;
    return UserModel.fromApi(map);
  }

  @override
  Stream<UserModel?> get userStream async* {
    final u = await getCurrentUser();
    yield u;
  }
}
