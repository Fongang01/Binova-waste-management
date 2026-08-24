import 'package:flutter/material.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/reset_password_usecase.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../../../core/usecases/usecase.dart';

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
      _status = _user != null ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    } catch (e) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    _status = AuthStatus.loading;
    notifyListeners();
    try {
      final userEntity = await loginUseCase(LoginParams(email: email, password: password));
      if (userEntity.role != 'driver') {
        throw Exception('This application is restricted to authorized waste collection agents.');
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
    final message = e.toString();
    if (message.contains('user-not-found')) return 'No user found with this email.';
    if (message.contains('wrong-password')) return 'Incorrect password.';
    if (message.contains('email-already-in-use')) return 'This email is already registered.';
    if (message.contains('invalid-email')) return 'Invalid email address.';
    if (message.contains('weak-password')) return 'Password is too weak.';
    if (message.contains('network-request-failed')) return 'Network error. Please check your connection.';
    return 'Authentication failed. Please try again.';
  }
}
