import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String uid;
  final String fullName;
  final String email;
  final String phone;
  final String role;
  final DateTime createdAt;
  final String profileImage;
  final String status;

  const UserEntity({
    required this.uid,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    required this.createdAt,
    required this.profileImage,
    required this.status,
  });

  @override
  List<Object?> get props => [uid, fullName, email, phone, role, createdAt, profileImage, status];
}
