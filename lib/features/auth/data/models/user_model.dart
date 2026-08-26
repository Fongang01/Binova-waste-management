import '../../domain/entities/user_entity.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel extends UserEntity {
  const UserModel({
    required super.uid,
    required super.fullName,
    required super.email,
    required super.phone,
    required super.role,
    required super.createdAt,
    required super.profileImage,
    required super.status,
  });

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      uid: map['uid'] ?? '',
      fullName: map['fullName'] ?? '',
      email: map['email'] ?? '',
      phone: map['phone'] ?? '',
      role: map['role'] ?? 'citizen',
      createdAt:
          map['createdAt'] is Timestamp
              ? (map['createdAt'] as Timestamp).toDate()
              : DateTime.tryParse(map['createdAt']?.toString() ?? '') ??
                  DateTime.now(),
      profileImage: map['profileImage'] ?? '',
      status: map['status'] ?? 'active',
    );
  }

  factory UserModel.fromApi(Map<String, dynamic> map) {
    final first = map['firstName'] ?? '';
    final last = map['lastName'] ?? '';
    final roleRaw = (map['role'] ?? '').toString();
    return UserModel(
      uid: (map['id'] ?? map['uid'] ?? '').toString(),
      fullName: ('$first ${last}').trim(),
      email: map['email'] ?? '',
      phone: map['phone'] ?? '',
      role: roleRaw.toString().toLowerCase(),
      createdAt:
          DateTime.tryParse(map['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      profileImage: map['profileImage'] ?? '',
      status: (map['status'] ?? 'active').toString().toLowerCase(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'fullName': fullName,
      'email': email,
      'phone': phone,
      'role': role,
      'createdAt': Timestamp.fromDate(createdAt),
      'profileImage': profileImage,
      'status': status,
    };
  }

  factory UserModel.fromEntity(UserEntity entity) {
    return UserModel(
      uid: entity.uid,
      fullName: entity.fullName,
      email: entity.email,
      phone: entity.phone,
      role: entity.role,
      createdAt: entity.createdAt,
      profileImage: entity.profileImage,
      status: entity.status,
    );
  }
}
