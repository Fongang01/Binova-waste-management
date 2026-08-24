import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'app.dart';

// Auth Dependencies
import 'features/auth/data/datasources/auth_remote_data_source.dart';
import 'features/auth/data/datasources/mock_auth_remote_data_source.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/domain/usecases/login_usecase.dart';
import 'features/auth/domain/usecases/logout_usecase.dart';
import 'features/auth/domain/usecases/reset_password_usecase.dart';
import 'features/auth/domain/usecases/get_current_user_usecase.dart';
import 'features/auth/presentation/providers/auth_provider.dart';

// Driver Dependencies
import 'features/driver/data/datasources/driver_remote_data_source.dart';
import 'features/driver/data/repositories/driver_repository_impl.dart';
import 'features/driver/domain/usecases/get_assigned_tasks_usecase.dart';
import 'features/driver/domain/usecases/get_assigned_truck_usecase.dart';
import 'features/driver/domain/usecases/update_task_status_usecase.dart';
import 'features/driver/presentation/providers/driver_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  bool isFirebaseInitialized = false;
  try {
    await Firebase.initializeApp();
    isFirebaseInitialized = true;
  } catch (e) {
    debugPrint('Firebase initialization failed: $e');
  }

  // Auth Data Source
  final authRemoteDataSource = isFirebaseInitialized 
    ? AuthRemoteDataSourceImpl(firebaseAuth: FirebaseAuth.instance, firestore: FirebaseFirestore.instance)
    : MockAuthRemoteDataSource();

  // Driver Data Source
  final driverRemoteDataSource = isFirebaseInitialized
    ? DriverRemoteDataSourceImpl() // Implement real logic in DriverRemoteDataSourceImpl
    : MockDriverRemoteDataSource();

  // Repositories
  final authRepository = AuthRepositoryImpl(remoteDataSource: authRemoteDataSource);
  final driverRepository = DriverRepositoryImpl(remoteDataSource: driverRemoteDataSource);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthNotifier(
            loginUseCase: LoginUseCase(authRepository),
            logoutUseCase: LogoutUseCase(authRepository),
            resetPasswordUseCase: ResetPasswordUseCase(authRepository),
            getCurrentUserUseCase: GetCurrentUserUseCase(authRepository),
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => DriverNotifier(
            getAssignedTasksUseCase: GetAssignedTasksUseCase(driverRepository),
            getAssignedTruckUseCase: GetAssignedTruckUseCase(driverRepository),
            updateTaskStatusUseCase: UpdateTaskStatusUseCase(driverRepository),
          ),
        ),
      ],
      child: const MyApp(),
    ),
  );
}
