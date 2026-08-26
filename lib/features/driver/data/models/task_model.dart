import 'package:cloud_firestore/cloud_firestore.dart';
import '../../domain/entities/task_entity.dart';
import 'truck_model.dart';

class TaskModel extends TaskEntity {
  final TruckModel? truck;

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
    this.truck,
  });

  factory TaskModel.fromMap(Map<String, dynamic> map, String id) {
    return TaskModel(
      id: id,
      binId: map['binId'] ?? '',
      location: map['location'] ?? '',
      latitude: (map['latitude'] as num).toDouble(),
      longitude: (map['longitude'] as num).toDouble(),
      fillLevel: map['fillLevel'] ?? 0,
      priority: TaskPriority.values.firstWhere(
        (e) => e.name == map['priority'],
        orElse: () => TaskPriority.medium,
      ),
      status: TaskStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => TaskStatus.assigned,
      ),
      assignedTime: (map['assignedTime'] as Timestamp).toDate(),
      truck:
          map['truck'] != null
              ? TruckModel.fromApi(Map<String, dynamic>.from(map['truck']))
              : null,
    );
  }

  factory TaskModel.fromApi(Map<String, dynamic> map) {
    final bin = map['bin'] ?? {};
    double lat = 0;
    double lng = 0;
    try {
      lat = (bin['latitude'] as num?)?.toDouble() ?? 0.0;
      lng = (bin['longitude'] as num?)?.toDouble() ?? 0.0;
    } catch (_) {}

    TaskPriority priority = TaskPriority.medium;
    final p = (map['priority'] ?? '').toString();
    if (p == 'LOW') priority = TaskPriority.low;
    if (p == 'NORMAL') priority = TaskPriority.medium;
    if (p == 'HIGH') priority = TaskPriority.high;
    if (p == 'CRITICAL') priority = TaskPriority.urgent;

    TaskStatus status = TaskStatus.assigned;
    final s = (map['status'] ?? '').toString();
    if (s == 'ASSIGNED') status = TaskStatus.assigned;
    if (s == 'IN_PROGRESS') status = TaskStatus.inProgress;
    if (s == 'COMPLETED') status = TaskStatus.completed;

    DateTime assignedAt = DateTime.now();
    if (map['assignedAt'] != null) {
      assignedAt =
          DateTime.tryParse(map['assignedAt'].toString()) ?? assignedAt;
    }

    return TaskModel(
      id: (map['id'] ?? '').toString(),
      binId: (map['binId'] ?? '').toString(),
      location: bin['address'] ?? '',
      latitude: lat,
      longitude: lng,
      fillLevel: ((bin['currentFillLevel'] ?? 0) as num).toInt(),
      priority: priority,
      status: status,
      assignedTime: assignedAt,
      truck:
          map['truck'] != null
              ? TruckModel.fromApi(Map<String, dynamic>.from(map['truck']))
              : null,
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
