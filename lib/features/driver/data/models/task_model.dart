import 'dart:convert';
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
    super.recommendedRoute,
    super.distanceKm,
    super.estimatedDuration,
    super.stopOrder,
    super.routeStops,
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
      recommendedRoute: map['recommendedRoute']?.toString(),
      distanceKm: (map['distanceKm'] as num?)?.toDouble(),
      estimatedDuration: (map['estimatedDuration'] as num?)?.toInt(),
      stopOrder: (map['stopOrder'] as num?)?.toInt(),
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
    if (p == 'CRITICAL' || p == 'URGENT') priority = TaskPriority.urgent;

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

    final recommendedRoute = map['recommendedRoute']?.toString();
    double? distanceKm = (map['distanceKm'] as num?)?.toDouble() ??
        (map['distance'] as num?)?.toDouble();
    int? estimatedDuration = (map['estimatedDuration'] as num?)?.toInt();

    int? stopOrder;
    final notes = (map['notes'] ?? '').toString();
    final match = RegExp(r'Stop #(\d+)').firstMatch(notes);
    if (match != null) {
      stopOrder = int.tryParse(match.group(1) ?? '');
    }

    final List<RouteStopEntity> routeStops = [];

    if (recommendedRoute != null && recommendedRoute.isNotEmpty) {
      try {
        final dynamic parsed = jsonDecode(recommendedRoute);
        if (parsed is Map) {
          if (parsed['distanceKm'] != null && (distanceKm == null || distanceKm == 0)) {
            distanceKm = (parsed['distanceKm'] as num).toDouble();
          }
          if (parsed['durationMinutes'] != null && (estimatedDuration == null || estimatedDuration == 0)) {
            estimatedDuration = (parsed['durationMinutes'] as num).toInt();
          }

          final rawStops = parsed['orderedStops'] ?? parsed['stops'];
          final completedIds = (parsed['completedStopIds'] as List<dynamic>?)
                  ?.map((e) => (e as num).toInt())
                  .toList() ??
              [];

          if (rawStops is List) {
            for (int i = 0; i < rawStops.length; i++) {
              final stopMap = rawStops[i];
              if (stopMap is Map) {
                final stopId = (stopMap['id'] as num?)?.toInt() ??
                    (stopMap['binId'] as num?)?.toInt() ??
                    (i + 1);
                final sBinId = (stopMap['binId'] as num?)?.toInt() ?? stopId;
                final sBinCode = (stopMap['binCode'] ?? 'BIN-$sBinId').toString();
                final sAddr = (stopMap['address'] ?? 'Yaoundé, Cameroon').toString();
                final sLat = (stopMap['latitude'] as num?)?.toDouble() ?? 0.0;
                final sLng = (stopMap['longitude'] as num?)?.toDouble() ?? 0.0;
                final sFill = ((stopMap['fillLevel'] ?? 0) as num).toInt();
                final sCap = ((stopMap['capacity'] ?? 50) as num).toDouble();
                final sOrder = (stopMap['stopOrder'] as num?)?.toInt() ?? (i + 1);
                final sCompleted = stopMap['isCompleted'] == true || completedIds.contains(stopId);

                final pStr = (stopMap['priority'] ?? '').toString();
                TaskPriority sPriority = TaskPriority.medium;
                if (pStr == 'LOW') sPriority = TaskPriority.low;
                if (pStr == 'NORMAL') sPriority = TaskPriority.medium;
                if (pStr == 'HIGH') sPriority = TaskPriority.high;
                if (pStr == 'CRITICAL' || pStr == 'URGENT') sPriority = TaskPriority.urgent;

                routeStops.add(RouteStopEntity(
                  id: stopId,
                  binId: sBinId,
                  binCode: sBinCode,
                  address: sAddr,
                  latitude: sLat,
                  longitude: sLng,
                  fillLevel: sFill,
                  capacity: sCap,
                  priority: sPriority,
                  stopOrder: sOrder,
                  isCompleted: sCompleted,
                ));
              }
            }
          }
        }
      } catch (_) {}
    }

    // If routeStops is not empty, use the first stop or current active stop for main coordinate fallbacks if needed
    if (lat == 0.0 && lng == 0.0 && routeStops.isNotEmpty) {
      final firstStop = routeStops.first;
      lat = firstStop.latitude;
      lng = firstStop.longitude;
    }

    return TaskModel(
      id: (map['id'] ?? '').toString(),
      binId: (map['binId'] ?? '').toString(),
      location: bin['address'] ?? (routeStops.isNotEmpty ? routeStops.first.address : ''),
      latitude: lat,
      longitude: lng,
      fillLevel: ((bin['currentFillLevel'] ?? (routeStops.isNotEmpty ? routeStops.first.fillLevel : 0)) as num).toInt(),
      priority: priority,
      status: status,
      assignedTime: assignedAt,
      recommendedRoute: recommendedRoute,
      distanceKm: distanceKm,
      estimatedDuration: estimatedDuration,
      stopOrder: stopOrder,
      routeStops: routeStops,
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
