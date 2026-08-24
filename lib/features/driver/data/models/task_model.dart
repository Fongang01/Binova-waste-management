import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/entities/task_entity.dart';

class TaskModel extends TaskEntity {
  const TaskModel({
    required super.id,
    required super.binId,
    required super.location,
    required super.latitude,
    required super.longitude,
    required super.fillLevel,
    required super.priority,
    required super.status,
    required super.assignedTime,
  });

  factory TaskModel.fromMap(Map<String, dynamic> map, String id) {
    return TaskModel(
      id: id,
      binId: map['binId'] ?? '',
      location: map['location'] ?? '',
      latitude: (map['latitude'] as num).toDouble(),
      longitude: (map['longitude'] as num).toDouble(),
      fillLevel: map['fillLevel'] ?? 0,
      priority: TaskPriority.values.firstWhere((e) => e.name == map['priority'], orElse: () => TaskPriority.medium),
      status: TaskStatus.values.firstWhere((e) => e.name == map['status'], orElse: () => TaskStatus.assigned),
      assignedTime: (map['assignedTime'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'binId': binId,
      'location': location,
      'latitude': latitude,
      'longitude': longitude,
      'fillLevel': fillLevel,
      'priority': priority.name,
      'status': status.name,
      'assignedTime': Timestamp.fromDate(assignedTime),
    };
  }
}
