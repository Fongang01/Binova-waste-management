import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<UserModel> login(String email, String password);
  Future<UserModel> register(UserModel user, String password);
  Future<void> logout();
  Future<void> resetPassword(String email);
  Future<UserModel?> getCurrentUser();
  Stream<UserModel?> get userStream;
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final FirebaseAuth firebaseAuth;
  final FirebaseFirestore firestore;

  AuthRemoteDataSourceImpl({required this.firebaseAuth, required this.firestore});

  @override
  Future<UserModel> login(String email, String password) async {
    final credential = await firebaseAuth.signInWithEmailAndPassword(email: email, password: password);
    final doc = await firestore.collection('users').doc(credential.user!.uid).get();
    if (!doc.exists) throw Exception('User data not found in Firestore');
    return UserModel.fromMap(doc.data()!);
  }

  @override
  Future<UserModel> register(UserModel user, String password) async {
    final credential = await firebaseAuth.createUserWithEmailAndPassword(email: user.email, password: password);
    final newUser = UserModel(
      uid: credential.user!.uid,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: 'citizen',
      createdAt: DateTime.now(),
      profileImage: '',
      status: 'active',
    );
    await firestore.collection('users').doc(newUser.uid).set(newUser.toMap());
    return newUser;
  }

  @override
  Future<void> logout() => firebaseAuth.signOut();

  @override
  Future<void> resetPassword(String email) => firebaseAuth.sendPasswordResetEmail(email: email);

  @override
  Future<UserModel?> getCurrentUser() async {
    final firebaseUser = firebaseAuth.currentUser;
    if (firebaseUser == null) return null;
    final doc = await firestore.collection('users').doc(firebaseUser.uid).get();
    if (!doc.exists) return null;
    return UserModel.fromMap(doc.data()!);
  }

  @override
  Stream<UserModel?> get userStream {
    return firebaseAuth.authStateChanges().asyncMap((firebaseUser) async {
      if (firebaseUser == null) return null;
      final doc = await firestore.collection('users').doc(firebaseUser.uid).get();
      if (!doc.exists) return null;
      return UserModel.fromMap(doc.data()!);
    });
  }
}
