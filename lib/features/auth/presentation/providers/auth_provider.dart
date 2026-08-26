import 'package:flutter/material.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/reset_password_usecase.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../../../core/usecases/usecase.dart';
import '../../../../core/config/api_config.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthNotifier extends ChangeNotifier {
  final LoginUseCase loginUseCase;
  final LogoutUseCase logoutUseCase;
  final ResetPasswordUseCase resetPasswordUseCase;
  final GetCurrentUserUseCase getCurrentUserUseCase;

  AuthStatus _status = AuthStatus.initial;
  UserEntity? _user;
  String? _errorMessage;

  AuthNotifier({
    required this.loginUseCase,
    required this.logoutUseCase,
    required this.resetPasswordUseCase,
    required this.getCurrentUserUseCase,
  }) {
    checkAuthStatus();
  }

  AuthStatus get status => _status;
  UserEntity? get user => _user;
  String? get errorMessage => _errorMessage;

  Future<void> checkAuthStatus() async {
    _status = AuthStatus.loading;
    notifyListeners();
    try {
      _user = await getCurrentUserUseCase(NoParams());
      _status =
          _user != null ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    } catch (e) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    _status = AuthStatus.loading;
    notifyListeners();
    try {
      final userEntity = await loginUseCase(
        LoginParams(email: email, password: password),
      );
      if (userEntity.role.toLowerCase() != 'driver') {
        throw Exception(
          'This application is restricted to authorized waste collection agents.',
        );
      }
      _user = userEntity;
      _status = AuthStatus.authenticated;
      _errorMessage = null;
    } catch (e) {
      _status = AuthStatus.error;
      _errorMessage = _handleError(e);
    }
    notifyListeners();
  }

  Future<void> resetPassword(String email) async {
    try {
      await resetPasswordUseCase(email);
    } catch (e) {
      _errorMessage = _handleError(e);
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    await logoutUseCase(NoParams());
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  String _handleError(dynamic e) {
    final raw = e.toString().replaceFirst('Exception: ', '').trim();
    final lower = raw.toLowerCase();
    if (lower.contains('connection refused') ||
        lower.contains('connection timeout') ||
        lower.contains('failed host lookup') ||
        lower.contains('socketexception') ||
        lower.contains('network error') ||
        lower.contains('no route to host') ||
        lower.contains('cannot reach server')) {
      return 'Cannot reach server at ${ApiConfig.baseUrl}. Ensure phone and PC are on the same Wi-Fi network or connected via USB.';
    }
    if (raw.isNotEmpty) return raw;
    return 'Authentication failed. Please try again.';
  }
}
