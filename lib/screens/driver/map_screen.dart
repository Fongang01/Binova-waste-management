import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../core/config/api_config.dart';
import '../../core/config/mapbox_config.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../features/driver/domain/entities/task_entity.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';

class BinMapItem {
  final int id;
  final String binCode;
  final double latitude;
  final double longitude;
  final String address;
  final double capacity;
  final int currentFillLevel;
  final String status;

  BinMapItem({
    required this.id,
    required this.binCode,
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.capacity,
    required this.currentFillLevel,
    required this.status,
  });
}

class DriverMapScreen extends StatefulWidget {
  const DriverMapScreen({super.key});

  @override
  State<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends State<DriverMapScreen> with TickerProviderStateMixin {
  final MapController _mapController = MapController();

  // Selected item for bottom sheet details
  BinMapItem? _selectedBin;
  TaskEntity? _associatedTask;
  RouteStopEntity? _selectedRouteStop;

  // Driver GPS Location
  Position? _currentPosition;
  StreamSubscription<Position>? _positionStreamSub;
  bool _hasLocationPermission = false;
  bool _isLocating = false;
  String? _locationStatusMessage;

  // Live Mapbox Road Route coordinates starting from Driver's actual GPS location
  List<LatLng> _liveRoadRouteCoordinates = [];
  bool _fetchingLiveRoute = false;
  String? _lastRouteKey;
  String? _lastFittedKey;

  // Animation controller for pulsing marker rings
  late AnimationController _pulseController;

  // Default camera center (Yaoundé, Cameroon)
  static const LatLng _yaoundeCenter = LatLng(
    MapboxConfig.yaoundeLatitude,
    MapboxConfig.yaoundeLongitude,
  );

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();

    _checkAndRequestLocation();
  }

  @override
  void dispose() {
    _positionStreamSub?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  /// Request GPS Location permissions and track current driver location in real time
  Future<void> _checkAndRequestLocation() async {
    setState(() => _isLocating = true);
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          setState(() {
            _locationStatusMessage = 'Location services disabled. Please enable GPS.';
            _isLocating = false;
          });
        }
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            setState(() {
              _hasLocationPermission = false;
              _locationStatusMessage = 'Location permission denied.';
              _isLocating = false;
            });
          }
          return;
        }
      }

      // Permission granted - get immediate position
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );

      if (mounted) {
        setState(() {
          _hasLocationPermission = true;
          _currentPosition = position;
          _locationStatusMessage = null;
          _isLocating = false;
        });

        final driverNotifier = context.read<DriverNotifier>();
        _updateDriverNavigationRoute(driverNotifier.activeAiTask, driverNotifier.tasks);
      }

      // Subscribe to real-time position updates
      _positionStreamSub?.cancel();
      _positionStreamSub = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      ).listen((pos) {
        if (mounted) {
          setState(() {
            _currentPosition = pos;
          });
          final driverNotifier = context.read<DriverNotifier>();
          _updateDriverNavigationRoute(driverNotifier.activeAiTask, driverNotifier.tasks);
        }
      });
    } catch (e) {
      debugPrint('GPS location error: $e');
      if (mounted) {
        setState(() => _isLocating = false);
      }
    }
  }

  /// Dynamically calculate road-following navigation route from current Driver GPS through all assigned stops in sequence
  Future<void> _updateDriverNavigationRoute(TaskEntity? aiTask, List<TaskEntity> activeTasks) async {
    if (_fetchingLiveRoute) return;

    final driverNotifier = context.read<DriverNotifier>();
    final assignedStops = driverNotifier.assignedActiveStops;

    if (assignedStops.isEmpty) {
      if (_liveRoadRouteCoordinates.isNotEmpty && mounted) {
        setState(() => _liveRoadRouteCoordinates = []);
      }
      return;
    }

    final List<LatLng> waypoints = [];
    for (final s in assignedStops) {
      if (s.latitude != 0 && s.longitude != 0) {
        waypoints.add(LatLng(s.latitude, s.longitude));
      }
    }

    if (waypoints.isEmpty) {
      if (_liveRoadRouteCoordinates.isNotEmpty && mounted) {
        setState(() => _liveRoadRouteCoordinates = []);
      }
      return;
    }

    // 2. Route Origin: Driver's actual live GPS location
    if (_currentPosition == null) {
      if (_liveRoadRouteCoordinates.isNotEmpty && mounted) {
        setState(() => _liveRoadRouteCoordinates = []);
      }
      return;
    }
    final LatLng origin = LatLng(_currentPosition!.latitude, _currentPosition!.longitude);

    // Cache key to prevent redundant network queries
    final routeKey = '${origin.latitude.toStringAsFixed(4)}_${origin.longitude.toStringAsFixed(4)}_${waypoints.map((w) => '${w.latitude.toStringAsFixed(4)},${w.longitude.toStringAsFixed(4)}').join(';')}_${assignedStops.length}';
    if (routeKey == _lastRouteKey) return;

    _fetchingLiveRoute = true;
    _lastRouteKey = routeKey;

    try {
      // Coordinates string for Mapbox Directions: {driverLng,driverLat};{stop1Lng,stop1Lat};{stop2Lng,stop2Lat}...
      final List<String> coordStrings = [
        '${origin.longitude},${origin.latitude}',
        ...waypoints.map((w) => '${w.longitude},${w.latitude}'),
      ];

      final token = MapboxConfig.token;
      if (token.isNotEmpty) {
        final url = 'https://api.mapbox.com/directions/v5/mapbox/driving/${coordStrings.join(';')}?geometries=geojson&overview=full&steps=true&access_token=$token';
        final response = await ApiClient().dio.get(url);
        if (response.statusCode == 200 && response.data != null) {
          final routes = response.data['routes'] as List?;
          if (routes != null && routes.isNotEmpty) {
            final geom = routes[0]['geometry'];
            if (geom is Map && geom['coordinates'] is List) {
              final coords = geom['coordinates'] as List;
              final List<LatLng> roadPoints = [];
              for (final c in coords) {
                if (c is List && c.length >= 2) {
                  final lng = (c[0] as num).toDouble();
                  final lat = (c[1] as num).toDouble();
                  if (lat != 0.0 && lng != 0.0) {
                    roadPoints.add(LatLng(lat, lng));
                  }
                }
              }

              if (roadPoints.isNotEmpty && mounted) {
                setState(() {
                  _liveRoadRouteCoordinates = roadPoints;
                });
                return;
              }
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Live Mapbox navigation route fetch error: $e');
    } finally {
      _fetchingLiveRoute = false;
    }

    // Fallback: If Mapbox API request fails or offline, connect [origin, ...waypoints] sequentially
    if (mounted && _liveRoadRouteCoordinates.isEmpty) {
      setState(() {
        _liveRoadRouteCoordinates = [origin, ...waypoints];
      });
    }
  }

  /// Refresh driver tasks and location
  Future<void> _refreshAll() async {
    final driverNotifier = context.read<DriverNotifier>();
    await Future.wait([
      driverNotifier.loadDashboardData(),
      _checkAndRequestLocation(),
    ]);
  }

  /// Center map on driver's real-time GPS position
  void _centerOnDriverLocation() async {
    if (_currentPosition != null) {
      _mapController.move(
        LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
        15.5,
      );
    } else {
      await _checkAndRequestLocation();
      if (_currentPosition != null) {
        _mapController.move(
          LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          15.5,
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_locationStatusMessage ?? 'Driver GPS location unavailable.'),
            backgroundColor: Colors.orange.shade800,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  /// Automatically fit map camera when an AI task or route is loaded
  void _checkAndAutoFitCamera(TaskEntity? aiTask, List<TaskEntity> activeTasks) {
    final driverNotifier = context.read<DriverNotifier>();
    final pendingCount = driverNotifier.pendingStopsCount;
    final assignedKey = driverNotifier.assignedActiveStops.map((s) => '${s.id}_${s.isCompleted}').join(',');
    final currentKey = '$pendingCount:$assignedKey';

    if (currentKey == _lastFittedKey) return;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _fitMapBounds();
      _lastFittedKey = currentKey;
    });
  }

  /// Recenter on Yaoundé
  void _recenterYaounde() {
    _mapController.move(_yaoundeCenter, 13.0);
  }

  /// Fit map bounds to encompass all active assigned route stops, road polyline geometry, and driver GPS
  void _fitMapBounds() {
    final driverNotifier = context.read<DriverNotifier>();
    final assignedStops = driverNotifier.assignedActiveStops;

    final List<LatLng> points = [];

    // 1. Include Live Road Route coordinates if available
    if (_liveRoadRouteCoordinates.isNotEmpty) {
      points.addAll(_liveRoadRouteCoordinates);
    }

    // 2. Include all confirmed assigned active route stops
    for (final s in assignedStops) {
      if (s.latitude != 0.0 && s.longitude != 0.0) {
        points.add(LatLng(s.latitude, s.longitude));
      }
    }

    // 3. Include Driver GPS Location
    if (_currentPosition != null) {
      points.add(LatLng(_currentPosition!.latitude, _currentPosition!.longitude));
    }

    if (points.isEmpty) {
      _recenterYaounde();
      return;
    }

    if (points.length == 1) {
      _mapController.move(points.first, 15.5);
      return;
    }

    try {
      final bounds = LatLngBounds.fromPoints(points);
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.symmetric(horizontal: 48.0, vertical: 80.0),
          maxZoom: 16.0,
        ),
      );
    } catch (e) {
      debugPrint('Fit camera bounds error: $e');
    }
  }

  /// Build markers strictly for the authenticated driver's assigned tasks and live GPS position
  List<Marker> _buildMarkers(List<TaskEntity> activeTasks, TaskEntity? aiTask) {
    final List<Marker> markers = [];

    // 1. REAL DRIVER GPS POSITION PIN
    if (_currentPosition != null && _hasLocationPermission) {
      markers.add(
        Marker(
          point: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          width: 50,
          height: 50,
          alignment: Alignment.center,
          child: AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final scale = 1.0 + (_pulseController.value * 0.4);
              final opacity = (1.0 - _pulseController.value).clamp(0.0, 1.0);

              return Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 44 * scale,
                    height: 44 * scale,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF2563EB).withValues(alpha: 0.25 * opacity),
                    ),
                  ),
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.25),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 14,
                    height: 14,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      );
    }

    // 2. CONFIRMED ASSIGNED BINS ONLY (Numbered Badges: #1, #2, ...)
    final driverNotifier = context.read<DriverNotifier>();
    final assignedStops = driverNotifier.assignedActiveStops;

    for (final stop in assignedStops) {
      if (stop.latitude != 0 && stop.longitude != 0) {
        TaskEntity? associatedTask;
        try {
          associatedTask = activeTasks.firstWhere((t) => int.tryParse(t.binId) == stop.binId);
        } catch (_) {
          associatedTask = aiTask ?? (activeTasks.isNotEmpty ? activeTasks.first : null);
        }

        markers.add(
          Marker(
            point: LatLng(stop.latitude, stop.longitude),
            width: 44,
            height: 44,
            alignment: Alignment.center,
            child: GestureDetector(
              onTap: () {
                final syntheticBin = BinMapItem(
                  id: stop.id,
                  binCode: stop.binCode,
                  latitude: stop.latitude,
                  longitude: stop.longitude,
                  address: stop.address,
                  capacity: stop.capacity,
                  currentFillLevel: stop.fillLevel,
                  status: 'ACTIVE',
                );
                setState(() {
                  _selectedRouteStop = stop;
                  _selectedBin = syntheticBin;
                  _associatedTask = associatedTask;
                });
              },
              child: _buildBinPinWidget(const Color(0xFF16A34A), stop.fillLevel, stopOrder: stop.stopOrder),
            ),
          ),
        );
      }
    }

    return markers;
  }

  Widget _buildBinPinWidget(Color color, int fillLevel, {int? stopOrder}) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.28),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Center(
        child: stopOrder != null
            ? Text(
                '$stopOrder',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              )
            : const Icon(
                Icons.delete_outline_rounded,
                color: Colors.white,
                size: 16,
              ),
      ),
    );
  }

  /// Polyline rendering for real road-following navigation route starting from Driver GPS
  List<Polyline> _buildPolylines(List<TaskEntity> activeTasks, TaskEntity? aiTask) {
    if (_liveRoadRouteCoordinates.length >= 2) {
      return [
        Polyline(
          points: _liveRoadRouteCoordinates,
          color: const Color(0xFF10B981), // Emerald green road line
          strokeWidth: 5.5,
        ),
      ];
    }

    // Fallback: Connect driver GPS position to pending stops in confirmed order
    if (_currentPosition == null) {
      return [];
    }

    final driverNotifier = context.read<DriverNotifier>();
    final assignedStops = driverNotifier.assignedActiveStops;
    if (assignedStops.isEmpty) {
      return [];
    }

    final List<LatLng> fallbackPoints = [
      LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
    ];
    for (final s in assignedStops) {
      if (s.latitude != 0 && s.longitude != 0) {
        fallbackPoints.add(LatLng(s.latitude, s.longitude));
      }
    }

    if (fallbackPoints.length >= 2) {
      return [
        Polyline(
          points: fallbackPoints,
          color: const Color(0xFF10B981),
          strokeWidth: 4.5,
        ),
      ];
    }

    return [];
  }

  @override
  Widget build(BuildContext context) {
    final driverNotifier = context.watch<DriverNotifier>();
    final aiTask = driverNotifier.activeAiTask;
    final activeTasks = driverNotifier.tasks
        .where((t) => t.status != TaskStatus.completed)
        .toList();
    final assignedStops = driverNotifier.assignedActiveStops;
    final pendingCount = driverNotifier.pendingStopsCount;

    // Trigger dynamic route calculation from driver GPS and auto-fit camera
    _updateDriverNavigationRoute(aiTask, activeTasks);
    _checkAndAutoFitCamera(aiTask, activeTasks);

    final markers = _buildMarkers(activeTasks, aiTask);
    final polylines = _buildPolylines(activeTasks, aiTask);

    return Scaffold(
      body: Stack(
        children: [
          // 1. FLUTTER MAP WITH MAPBOX VECTOR/RASTER TILES
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _yaoundeCenter,
              initialZoom: MapboxConfig.defaultZoom,
              minZoom: 10.0,
              maxZoom: 18.0,
              onTap: (tapPosition, point) {
                if (_selectedBin != null) {
                  setState(() {
                    _selectedBin = null;
                    _associatedTask = null;
                    _selectedRouteStop = null;
                  });
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: MapboxConfig.mapboxStreetsTileUrl,
                userAgentPackageName: 'smart_waste_collection_app',
                maxZoom: 19,
              ),

              if (polylines.isNotEmpty)
                PolylineLayer(
                  polylines: polylines,
                ),

              // Live Markers Layer (Driver GPS + Only Assigned Bins)
              MarkerLayer(
                markers: markers,
              ),
            ],
          ),

          // 2. TOP FLOATING APP BAR & NAVIGATION HUD / EMPTY STATE BANNER
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            right: 16,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Header Row
                Row(
                  children: [
                    Builder(
                      builder: (ctx) => Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        elevation: 4,
                        shadowColor: Colors.black26,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () => Scaffold.of(ctx).openDrawer(),
                          child: const Padding(
                            padding: EdgeInsets.all(11),
                            child: Icon(Icons.menu_rounded, color: AppTheme.darkText, size: 22),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: const [
                            BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 3)),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  Container(
                                    width: 9,
                                    height: 9,
                                    decoration: BoxDecoration(
                                      color: pendingCount > 0
                                          ? AppTheme.primaryEmerald
                                          : Colors.grey.shade400,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      pendingCount > 0
                                          ? (aiTask != null
                                              ? 'Assigned AI Route: $pendingCount ${pendingCount == 1 ? "Stop" : "Stops"}'
                                              : '$pendingCount Assigned ${pendingCount == 1 ? "Bin" : "Bins"}')
                                          : 'No Active Tasks Assigned',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                        color: AppTheme.darkText,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (pendingCount > 0) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryEmerald.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '$pendingCount Pending',
                                  style: const TextStyle(
                                    color: AppTheme.primaryEmerald,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Material(
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(14),
                      elevation: 3,
                      shadowColor: Colors.black26,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: driverNotifier.isLoading ? null : _refreshAll,
                        child: Padding(
                          padding: const EdgeInsets.all(11),
                          child: driverNotifier.isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2.5, color: AppTheme.primaryEmerald),
                                )
                              : const Icon(Icons.refresh_rounded, color: AppTheme.primaryEmerald, size: 22),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),

                // Navigation HUD or Clean Empty State Banner
                if (pendingCount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: const [
                        BoxShadow(color: Colors.black38, blurRadius: 10, offset: Offset(0, 4)),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.navigation_rounded, color: Color(0xFF10B981), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Next: Stop #1 (${assignedStops.first.binCode}) • $pendingCount ${pendingCount == 1 ? "Stop" : "Stops"} Pending',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                        if (aiTask?.distanceKm != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${aiTask!.distanceKm!.toStringAsFixed(1)} km',
                              style: const TextStyle(
                                color: Color(0xFF10B981),
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                      boxShadow: const [
                        BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                      ],
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.location_searching_rounded, color: AppTheme.greyText, size: 16),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'No collection tasks assigned • Live GPS Standby',
                            style: TextStyle(
                              color: AppTheme.greyText,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          // 3. MAP CONTROLS
          Positioned(
            right: 16,
            bottom: _selectedBin != null ? 220 : 20,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton.small(
                  heroTag: 'map_server_diag',
                  backgroundColor: Colors.white,
                  foregroundColor: AppTheme.darkText,
                  elevation: 4,
                  onPressed: _showServerDiagnosticsSheet,
                  child: const Icon(Icons.dns_outlined, size: 19),
                ),
                const SizedBox(height: 8),
                // Fit All Route Bins Button
                FloatingActionButton.small(
                  heroTag: 'map_fit_bounds',
                  backgroundColor: Colors.white,
                  foregroundColor: AppTheme.darkText,
                  elevation: 4,
                  onPressed: _fitMapBounds,
                  child: const Icon(Icons.center_focus_strong_rounded, size: 20),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'map_yaounde_center',
                  backgroundColor: Colors.white,
                  foregroundColor: AppTheme.darkText,
                  elevation: 4,
                  onPressed: _recenterYaounde,
                  child: const Icon(Icons.location_city_rounded, size: 20),
                ),
                const SizedBox(height: 12),
                FloatingActionButton(
                  heroTag: 'map_my_location',
                  backgroundColor: AppTheme.primaryEmerald,
                  foregroundColor: Colors.white,
                  elevation: 6,
                  onPressed: _isLocating ? null : _centerOnDriverLocation,
                  child: _isLocating
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Icon(Icons.my_location_rounded, size: 26),
                ),
              ],
            ),
          ),

          // 4. SELECTED BIN DETAILS CARD
          if (_selectedBin != null)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: _buildBinDetailsCard(
                _selectedBin!,
                _associatedTask,
                _selectedRouteStop,
                driverNotifier,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBinDetailsCard(
    BinMapItem bin,
    TaskEntity? task,
    RouteStopEntity? routeStop,
    DriverNotifier notifier,
  ) {
    final isAi = task?.isAiOptimized == true && routeStop != null;
    final fillLevel = isAi ? routeStop.fillLevel : bin.currentFillLevel;
    final isCritical = fillLevel >= 80;
    final isWarning = fillLevel >= 50 && fillLevel < 80;
    final fillPercent = (fillLevel / 100.0).clamp(0.0, 1.0);

    Color fillBarColor = const Color(0xFF16A34A);
    if (isCritical) {
      fillBarColor = const Color(0xFFEF4444);
    } else if (isWarning) {
      fillBarColor = const Color(0xFFF59E0B);
    }

    return SafeArea(
      top: false,
      child: Card(
        elevation: 10,
        shadowColor: Colors.black38,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isCritical
                                ? Colors.red.shade50
                                : (isWarning ? Colors.orange.shade50 : Colors.green.shade50),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            isAi ? Icons.alt_route_rounded : Icons.delete_sweep_rounded,
                            color: isCritical
                                ? Colors.red
                                : (isWarning ? Colors.orange.shade800 : AppTheme.primaryEmerald),
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isAi ? 'Stop #${routeStop.stopOrder}: ${routeStop.binCode}' : bin.binCode,
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: AppTheme.greyText, size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => setState(() {
                      _selectedBin = null;
                      _associatedTask = null;
                      _selectedRouteStop = null;
                    }),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on_outlined, size: 16, color: AppTheme.greyText),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      (isAi ? routeStop.address : bin.address).isNotEmpty
                          ? (isAi ? routeStop.address : bin.address)
                          : '${bin.latitude.toStringAsFixed(5)}°, ${bin.longitude.toStringAsFixed(5)}°',
                      style: const TextStyle(color: AppTheme.darkText, fontSize: 12, height: 1.3),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: fillPercent,
                  minHeight: 7,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: AlwaysStoppedAnimation<Color>(fillBarColor),
                ),
              ),
              const SizedBox(height: 12),
            if (isAi)
              SizedBox(
                width: double.infinity,
                child: routeStop.isCompleted
                    ? Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.green.shade200),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.check_circle_rounded, color: Colors.green, size: 18),
                            SizedBox(width: 8),
                            Text(
                              'Stop Already Collected',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 14),
                            ),
                          ],
                        ),
                      )
                    : ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryEmerald,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        icon: const Icon(Icons.check_circle_outline_rounded, color: Colors.white, size: 20),
                        label: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            'Complete Stop #${routeStop.stopOrder} Collection',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                          ),
                        ),
                        onPressed: () async {
                          await notifier.completeStop(task!.id, routeStop.id);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Stop #${routeStop.stopOrder} (${routeStop.binCode}) collected!'),
                                backgroundColor: AppTheme.primaryEmerald,
                              ),
                            );
                            setState(() {
                              _selectedBin = null;
                              _associatedTask = null;
                              _selectedRouteStop = null;
                            });
                          }
                        },
                      ),
              )
            else if (task != null)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: task.status == TaskStatus.inProgress
                        ? const Color(0xFF2563EB)
                        : AppTheme.primaryEmerald,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  icon: Icon(
                    task.status == TaskStatus.inProgress
                        ? Icons.check_circle_outline_rounded
                        : Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                  label: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      task.status == TaskStatus.inProgress
                          ? 'Mark as Emptied & Complete'
                          : 'Start Collection Route',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                    ),
                  ),
                  onPressed: () async {
                    if (task.status == TaskStatus.inProgress) {
                      await notifier.updateStatus(task.id, TaskStatus.completed);
                      setState(() {
                        _selectedBin = null;
                        _associatedTask = null;
                        _selectedRouteStop = null;
                      });
                    } else {
                      await notifier.updateStatus(task.id, TaskStatus.inProgress);
                    }
                  },
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

  void _showServerDiagnosticsSheet() {
    final controller = TextEditingController(text: ApiConfig.baseUrl);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (sheetContext, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Backend Network Diagnostics',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(controller: controller),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryEmerald,
                            foregroundColor: Colors.white,
                          ),
                          onPressed: () async {
                            final target = controller.text.trim();
                            if (target.isNotEmpty) {
                              await ApiConfig.setBaseUrl(target);
                              if (ctx.mounted) {
                                Navigator.pop(ctx);
                              }
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Server endpoint saved: $target'),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              }
                            }
                          },
                          child: const Text('Save & Apply'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
