import 'package:equatable/equatable.dart';

enum TaskStatus { assigned, accepted, inProgress, completed }
enum TaskPriority { low, medium, high, urgent }

class RouteStopEntity extends Equatable {
  final int id;
  final int binId;
  final String binCode;
  final String address;
  final double latitude;
  final double longitude;
  final int fillLevel;
  final double capacity;
  final TaskPriority priority;
  final int stopOrder;
  final bool isCompleted;

  const RouteStopEntity({
    required this.id,
    required this.binId,
    required this.binCode,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.fillLevel,
    required this.capacity,
    required this.priority,
    required this.stopOrder,
    this.isCompleted = false,
  });

  @override
  List<Object?> get props => [
        id,
        binId,
        binCode,
        address,
        latitude,
        longitude,
        fillLevel,
        capacity,
        priority,
        stopOrder,
        isCompleted,
      ];
}

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
  final String? recommendedRoute;
  final double? distanceKm;
  final int? estimatedDuration;
  final int? stopOrder;
  final List<RouteStopEntity> routeStops;

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
    this.recommendedRoute,
    this.distanceKm,
    this.estimatedDuration,
    this.stopOrder,
    this.routeStops = const [],
  });

  bool get isAiOptimized =>
      recommendedRoute != null &&
      recommendedRoute!.isNotEmpty &&
      (routeStops.isNotEmpty || (distanceKm != null && distanceKm! > 0));

  int get totalStops => routeStops.isNotEmpty ? routeStops.length : 1;

  int get pendingStopsCount =>
      routeStops.isNotEmpty
          ? routeStops.where((s) => !s.isCompleted).length
          : (status == TaskStatus.completed ? 0 : 1);

  int get completedStopsCount =>
      routeStops.isNotEmpty ? routeStops.where((s) => s.isCompleted).length : (status == TaskStatus.completed ? 1 : 0);

  int get currentStopNumber {
    if (routeStops.isEmpty) return 1;
    final nextIdx = routeStops.indexWhere((s) => !s.isCompleted);
    return nextIdx >= 0 ? nextIdx + 1 : routeStops.length;
  }

  RouteStopEntity? get currentStop {
    if (routeStops.isEmpty) return null;
    return routeStops.firstWhere((s) => !s.isCompleted, orElse: () => routeStops.last);
  }

  @override
  List<Object?> get props => [
        id,
        binId,
        location,
        latitude,
        longitude,
        fillLevel,
        priority,
        status,
        assignedTime,
        recommendedRoute,
        distanceKm,
        estimatedDuration,
        stopOrder,
        routeStops,
      ];
}

