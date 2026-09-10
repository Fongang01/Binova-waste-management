import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../../domain/entities/task_entity.dart';
import 'truck_model.dart';

class TaskModel extends TaskEntity {
  final TruckModel? truck;

  const TaskModel({
    required super.id,
    required super.binId,
    super.binCode,
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
      binCode: map['binCode']?.toString(),
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
    final String? binCode = (bin['binCode'] ?? bin['code'] ?? (map['binId'] != null ? 'BIN-${map['binId']}' : null))?.toString();
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

    double? distanceKm = (map['distanceKm'] as num?)?.toDouble() ??
        (map['distance'] as num?)?.toDouble();
    int? estimatedDuration = (map['estimatedDuration'] as num?)?.toInt();

    int? stopOrder;
    final notes = (map['notes'] ?? '').toString();
    final match = RegExp(r'Stop #(\d+)').firstMatch(notes);
    if (match != null) {
      stopOrder = int.tryParse(match.group(1) ?? '');
    }

    dynamic parsedRoute;
    String? recommendedRouteStr;
    final rawRoute = map['recommendedRoute'];

    if (rawRoute is Map) {
      parsedRoute = rawRoute;
      try {
        recommendedRouteStr = jsonEncode(rawRoute);
      } catch (_) {
        recommendedRouteStr = null;
      }
    } else if (rawRoute is String && rawRoute.trim().isNotEmpty) {
      recommendedRouteStr = rawRoute;
      try {
        parsedRoute = jsonDecode(rawRoute);
      } catch (e) {
        // Double-decode attempt in case string was double escaped
        try {
          if (rawRoute.startsWith('"{') && rawRoute.endsWith('}"')) {
            final unescaped = jsonDecode(rawRoute);
            if (unescaped is String) {
              parsedRoute = jsonDecode(unescaped);
            }
          }
        } catch (_) {}
      }
    }

    final List<RouteStopEntity> routeStops = [];

    if (parsedRoute is Map) {
      if (parsedRoute['distanceKm'] != null && (distanceKm == null || distanceKm == 0)) {
        distanceKm = (parsedRoute['distanceKm'] as num).toDouble();
      }
      if (parsedRoute['durationMinutes'] != null && (estimatedDuration == null || estimatedDuration == 0)) {
        estimatedDuration = (parsedRoute['durationMinutes'] as num).toInt();
      }

      final rawStops = parsedRoute['orderedStops'] ?? parsedRoute['stops'];
      final completedIds = (parsedRoute['completedStopIds'] as List<dynamic>?)
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

            final pStr = (stopMap['priority'] ?? '').toString().toUpperCase();
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

    // Diagnostic logging for AI collection routes
    final isAi = routeStops.isNotEmpty || (parsedRoute is Map && parsedRoute['isAiOptimized'] == true);
    if (isAi) {
      final dynamic geom = parsedRoute is Map ? (parsedRoute['geometry'] ?? parsedRoute['route']?['geometry']) : null;
      int geomCount = 0;
      if (geom is Map && geom['coordinates'] is List) {
        geomCount = (geom['coordinates'] as List).length;
      } else if (geom is List) {
        geomCount = geom.length;
      }
      debugPrint('[BINOVA AI Route] Task #${map['id']}: ${routeStops.length} stops, $geomCount geometry coords');
    }

    // If routeStops is not empty, use the first stop or current active stop for main coordinate fallbacks if needed
    if (lat == 0.0 && lng == 0.0 && routeStops.isNotEmpty) {
      final firstStop = routeStops.first;
      lat = firstStop.latitude;
      lng = firstStop.longitude;
    }

    // Ensure every task has at least its confirmed assigned bin as a RouteStopEntity
    final taskBinIdInt = int.tryParse((map['binId'] ?? '').toString()) ?? (bin['id'] as num?)?.toInt() ?? 0;
    if (routeStops.isEmpty && lat != 0.0 && lng != 0.0) {
      routeStops.add(RouteStopEntity(
        id: taskBinIdInt,
        binId: taskBinIdInt,
        binCode: binCode ?? 'BIN-$taskBinIdInt',
        address: (bin['address'] ?? 'Yaoundé, Cameroon').toString(),
        latitude: lat,
        longitude: lng,
        fillLevel: ((bin['currentFillLevel'] ?? 0) as num).toInt(),
        capacity: ((bin['capacity'] ?? 50) as num).toDouble(),
        priority: priority,
        stopOrder: 1,
        isCompleted: status == TaskStatus.completed,
      ));
    }

    return TaskModel(
      id: (map['id'] ?? '').toString(),
      binId: (map['binId'] ?? '').toString(),
      binCode: binCode,
      location: bin['address'] ?? (routeStops.isNotEmpty ? routeStops.first.address : ''),
      latitude: lat,
      longitude: lng,
      fillLevel: ((bin['currentFillLevel'] ?? (routeStops.isNotEmpty ? routeStops.first.fillLevel : 0)) as num).toInt(),
      priority: priority,
      status: status,
      assignedTime: assignedAt,
      recommendedRoute: recommendedRouteStr,
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
