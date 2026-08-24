import 'package:equatable/equatable.dart';

enum TaskStatus { assigned, accepted, inProgress, completed }
enum TaskPriority { low, medium, high, urgent }

class TaskEntity extends Equatable {
  final String id;
  final String binId;
  final String location;
  final double latitude;
  final double longitude;
  final int fillLevel;
  final TaskPriority priority;
  final TaskStatus status;
  final DateTime assignedTime;

  const TaskEntity({
    required this.id,
    required this.binId,
    required this.location,
    required this.latitude,
    required this.longitude,
    required this.fillLevel,
    required this.priority,
    required this.status,
    required this.assignedTime,
  });

  @override
  List<Object?> get props => [id, binId, location, latitude, longitude, fillLevel, priority, status, assignedTime];
}
