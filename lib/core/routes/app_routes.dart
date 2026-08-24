import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/auth/splash_screen.dart';
import '../../screens/auth/welcome_screen.dart';
import '../../screens/auth/forgot_password_screen.dart';
import '../../screens/driver/driver_dashboard.dart';
// Future screens will be imported here
// import '../../screens/driver/home_screen.dart';
// import '../../screens/driver/tasks_screen.dart';
// import '../../screens/driver/map_screen.dart';
// import '../../screens/driver/profile_screen.dart';

import '../../screens/driver/notifications_screen.dart';
import '../../screens/driver/route_screen.dart';
import '../../screens/driver/history_screen.dart';

class AppRoutes {
  static const String splash = '/';
  static const String welcome = '/welcome';
  static const String login = '/login';
  static const String forgotPassword = '/forgot-password';

  // Driver Routes
  static const String driverDashboard = '/driver';
  static const String driverNotifications = '/notifications';
  static const String driverRoute = '/route';
  static const String driverHistory = '/history';

  static GoRouter createRouter(AuthNotifier authNotifier) {
    return GoRouter(
      initialLocation: splash,
      refreshListenable: authNotifier,
      redirect: (context, state) {
        final status = authNotifier.status;

        if (status == AuthStatus.initial || status == AuthStatus.loading) {
          return null;
        }

        final bool onAuthScreen = state.matchedLocation == login ||
            state.matchedLocation == welcome ||
            state.matchedLocation == splash;

        if (status == AuthStatus.authenticated) {
          if (onAuthScreen) {
            final role = authNotifier.user?.role;
            if (role == 'driver') return driverDashboard;
            return welcome; 
          }
        }

        if (status == AuthStatus.unauthenticated || status == AuthStatus.error) {
          if (!onAuthScreen) {
            return welcome;
          }
        }

        return null;
      },
      routes: [
        GoRoute(path: splash, name: 'splash', builder: (context, state) => const SplashScreen()),
        GoRoute(path: welcome, name: 'welcome', builder: (context, state) => const WelcomeScreen()),
        GoRoute(path: login, name: 'login', builder: (context, state) => const LoginScreen()),
        GoRoute(path: forgotPassword, name: 'forgotPassword', builder: (context, state) => const ForgotPasswordScreen()),
        
        GoRoute(path: driverDashboard, name: 'driver', builder: (context, state) => const DriverDashboard()),
        GoRoute(path: driverNotifications, name: 'notifications', builder: (context, state) => const DriverNotificationsScreen()),
        GoRoute(path: driverRoute, name: 'route', builder: (context, state) => const DriverRouteScreen()),
        GoRoute(path: driverHistory, name: 'history', builder: (context, state) => const DriverHistoryScreen()),
      ],
    );
  }
}
