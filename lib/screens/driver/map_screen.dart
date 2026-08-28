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

  factory BinMapItem.fromJson(Map<String, dynamic> json) {
    return BinMapItem(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      binCode: (json['binCode'] ?? json['code'] ?? 'BIN-${json['id']}').toString(),
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      address: (json['address'] ?? '').toString(),
      capacity: (json['capacity'] as num?)?.toDouble() ?? 50.0,
      currentFillLevel: (json['currentFillLevel'] as num?)?.toInt() ?? 0,
      status: (json['status'] ?? 'ACTIVE').toString().toUpperCase(),
    );
  }
}

class DriverMapScreen extends StatefulWidget {
  const DriverMapScreen({super.key});

  @override
  State<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends State<DriverMapScreen> with TickerProviderStateMixin {
  final MapController _mapController = MapController();

  // Real Bin data from BINOVA backend
  List<BinMapItem> _bins = [];
  bool _loadingBins = false;
  String? _backendError;

  // Selected item for bottom sheet details
  BinMapItem? _selectedBin;
  TaskEntity? _associatedTask;

  // Driver GPS Location
  Position? _currentPosition;
  StreamSubscription<Position>? _positionStreamSub;
  bool _hasLocationPermission = false;
  bool _isLocating = false;
  String? _locationStatusMessage;

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

    _fetchRealBins();
    _checkAndRequestLocation();
  }

  @override
  void dispose() {
    _positionStreamSub?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  /// Request GPS Location permissions and track current driver location
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

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() {
            _hasLocationPermission = false;
            _locationStatusMessage = 'Location permission permanently denied. Enable in Settings.';
            _isLocating = false;
          });
        }
        return;
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
      }

      // Subscribe to real-time position updates
      _positionStreamSub?.cancel();
      _positionStreamSub = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 5,
        ),
      ).listen((pos) {
        if (mounted) {
          setState(() {
            _currentPosition = pos;
          });
        }
      });
    } catch (e) {
      debugPrint('GPS location error: $e');
      if (mounted) {
        setState(() => _isLocating = false);
      }
    }
  }

  /// Fetch real municipal bins from BINOVA backend
  Future<void> _fetchRealBins() async {
    if (_loadingBins) return;
    setState(() {
      _loadingBins = true;
      _backendError = null;
    });

    try {
      final resp = await ApiClient().dio.get('/api/bins');
      if (resp.statusCode == 200 && resp.data != null) {
        final dynamic rawList = resp.data['data'] ?? resp.data;
        if (rawList is List) {
          final loaded = rawList
              .map((e) => BinMapItem.fromJson(Map<String, dynamic>.from(e)))
              .where((b) => b.latitude != 0.0 && b.longitude != 0.0)
              .toList();

          if (mounted) {
            setState(() {
              _bins = loaded;
              _loadingBins = false;
            });
          }
          return;
        }
      }
    } catch (e) {
      debugPrint('Error fetching bins from backend: $e');
      if (mounted) {
        setState(() {
          _backendError = 'Could not reach server at ${ApiConfig.baseUrl}.';
          _loadingBins = false;
        });
      }
    } finally {
      if (mounted && _loadingBins) {
        setState(() => _loadingBins = false);
      }
    }
  }

  /// Refresh both real bins and driver tasks
  Future<void> _refreshAll() async {
    final driverNotifier = context.read<DriverNotifier>();
    await Future.wait([
      _fetchRealBins(),
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

  /// Recenter on Yaoundé
  void _recenterYaounde() {
    _mapController.move(_yaoundeCenter, 13.0);
  }

  /// Fit map bounds to encompass all bins and driver position
  void _fitMapBounds() {
    final driverNotifier = context.read<DriverNotifier>();
    final activeTasks = driverNotifier.tasks
        .where((t) => t.status != TaskStatus.completed && t.latitude != 0 && t.longitude != 0)
        .toList();

    final List<LatLng> points = [];

    if (_currentPosition != null) {
      points.add(LatLng(_currentPosition!.latitude, _currentPosition!.longitude));
    }

    for (final b in _bins) {
      points.add(LatLng(b.latitude, b.longitude));
    }

    for (final t in activeTasks) {
      points.add(LatLng(t.latitude, t.longitude));
    }

    if (points.isEmpty) {
      _recenterYaounde();
      return;
    }

    if (points.length == 1) {
      _mapController.move(points.first, 15.0);
      return;
    }

    final bounds = LatLngBounds.fromPoints(points);
    _mapController.fitCamera(
      CameraFit.bounds(
        bounds: bounds,
        padding: const EdgeInsets.all(60.0),
        maxZoom: 16.0,
      ),
    );
  }

  /// Build markers for all real bins, active tasks, and the driver's real-time position
  List<Marker> _buildMarkers(List<TaskEntity> activeTasks) {
    final List<Marker> markers = [];

    // 1. REAL DRIVER GPS POSITION MARKER
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
                  // Pulsing outer ripple
                  Container(
                    width: 44 * scale,
                    height: 44 * scale,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF2563EB).withValues(alpha: 0.25 * opacity),
                    ),
                  ),
                  // White boundary ring
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
                  // Solid Blue Center Pin
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

    // 2. REAL BINS FROM BACKEND
    for (final bin in _bins) {
      final task = activeTasks.cast<TaskEntity?>().firstWhere(
            (t) => t?.binId == bin.id.toString() || t?.binId == bin.binCode,
            orElse: () => null,
          );

      final isCritical = bin.currentFillLevel >= 80;
      final isModerate = bin.currentFillLevel >= 50 && bin.currentFillLevel < 80;

      Color pinColor = const Color(0xFF16A34A); // Normal Green
      if (isCritical) {
        pinColor = const Color(0xFFEF4444); // Critical Red
      } else if (isModerate) {
        pinColor = const Color(0xFFF59E0B); // Moderate Orange
      }

      markers.add(
        Marker(
          point: LatLng(bin.latitude, bin.longitude),
          width: 44,
          height: 44,
          alignment: Alignment.topCenter,
          child: GestureDetector(
            onTap: () {
              setState(() {
                _selectedBin = bin;
                _associatedTask = task;
              });
              _mapController.move(LatLng(bin.latitude, bin.longitude), 15.5);
            },
            child: isCritical
                ? AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Stack(
                        alignment: Alignment.center,
                        children: [
                          Container(
                            width: 38 + (_pulseController.value * 6),
                            height: 38 + (_pulseController.value * 6),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: pinColor.withValues(alpha: 0.3 * (1 - _pulseController.value)),
                            ),
                          ),
                          _buildBinPinWidget(pinColor, bin.currentFillLevel),
                        ],
                      );
                    },
                  )
                : _buildBinPinWidget(pinColor, bin.currentFillLevel),
          ),
        ),
      );
    }

    // 3. Fallback: If bins list is empty but tasks exist, render task markers
    if (_bins.isEmpty) {
      for (final task in activeTasks) {
        if (task.latitude == 0 || task.longitude == 0) continue;
        final isCritical = task.fillLevel >= 80;
        final isModerate = task.fillLevel >= 50 && task.fillLevel < 80;

        Color pinColor = const Color(0xFF16A34A);
        if (isCritical) {
          pinColor = const Color(0xFFEF4444);
        } else if (isModerate) {
          pinColor = const Color(0xFFF59E0B);
        }

        markers.add(
          Marker(
            point: LatLng(task.latitude, task.longitude),
            width: 44,
            height: 44,
            alignment: Alignment.topCenter,
            child: GestureDetector(
              onTap: () {
                final syntheticBin = BinMapItem(
                  id: int.tryParse(task.binId) ?? 0,
                  binCode: 'BIN-${task.binId}',
                  latitude: task.latitude,
                  longitude: task.longitude,
                  address: task.location,
                  capacity: 50,
                  currentFillLevel: task.fillLevel,
                  status: 'ACTIVE',
                );
                setState(() {
                  _selectedBin = syntheticBin;
                  _associatedTask = task;
                });
                _mapController.move(LatLng(task.latitude, task.longitude), 15.5);
              },
              child: _buildBinPinWidget(pinColor, task.fillLevel),
            ),
          ),
        );
      }
    }

    return markers;
  }

  Widget _buildBinPinWidget(Color color, int fillLevel) {
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
      child: const Center(
        child: Icon(
          Icons.delete_outline_rounded,
          color: Colors.white,
          size: 16,
        ),
      ),
    );
  }

  /// Polyline foundation for Future AI Route visualization on real roads
  List<Polyline> _buildPolylines(List<TaskEntity> activeTasks) {
    final validTasks = activeTasks
        .where((t) => t.latitude != 0 && t.longitude != 0)
        .toList();

    if (validTasks.isEmpty) return [];

    final List<LatLng> polylinePoints = [];

    // Start from driver current GPS position if available
    if (_currentPosition != null) {
      polylinePoints.add(LatLng(_currentPosition!.latitude, _currentPosition!.longitude));
    }

    // Connect collection route waypoints
    for (final task in validTasks) {
      polylinePoints.add(LatLng(task.latitude, task.longitude));
    }

    if (polylinePoints.length < 2) return [];

    return [
      Polyline(
        points: polylinePoints,
        color: AppTheme.primaryEmerald,
        strokeWidth: 4.5,
        pattern: StrokePattern.dashed(segments: const [12, 6]),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final driverNotifier = context.watch<DriverNotifier>();
    final activeTasks = driverNotifier.tasks
        .where((t) => t.status != TaskStatus.completed)
        .toList();

    final markers = _buildMarkers(activeTasks);
    final polylines = _buildPolylines(activeTasks);

    return Scaffold(
      body: Stack(
        children: [
          // 1. REAL MAPBOX MAP VIEWPORT
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _currentPosition != null
                  ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
                  : _yaoundeCenter,
              initialZoom: 13.0,
              minZoom: 4.0,
              maxZoom: 18.0,
              onTap: (_, __) {
                if (_selectedBin != null) {
                  setState(() {
                    _selectedBin = null;
                    _associatedTask = null;
                  });
                }
              },
            ),
            children: [
              // Mapbox Streets v12 Raster Tile Layer with public access token
              TileLayer(
                urlTemplate: MapboxConfig.mapboxStreetsTileUrl,
                userAgentPackageName: 'smart_waste_collection_app',
                maxZoom: 19,
                errorTileCallback: (tile, error, stackTrace) {
                  debugPrint('Mapbox tile load warning: $error');
                },
              ),

              // AI Route Polyline Layer
              if (polylines.isNotEmpty)
                PolylineLayer(
                  polylines: polylines,
                ),

              // Live Markers Layer (Driver GPS + Bins)
              MarkerLayer(
                markers: markers,
              ),
            ],
          ),

          // 2. TOP FLOATING APP BAR
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            right: 16,
            child: Row(
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
                        Row(
                          children: [
                            Container(
                              width: 9,
                              height: 9,
                              decoration: const BoxDecoration(
                                color: AppTheme.primaryEmerald,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${_bins.isNotEmpty ? _bins.length : activeTasks.length} Bins Monitored',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: AppTheme.darkText,
                              ),
                            ),
                          ],
                        ),
                        if (activeTasks.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryEmerald.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${activeTasks.length} Assigned',
                              style: const TextStyle(
                                color: AppTheme.primaryEmerald,
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        if (_backendError != null && _bins.isEmpty)
                          InkWell(
                            onTap: _showServerDiagnosticsSheet,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.wifi_off_rounded, size: 12, color: Colors.orange.shade800),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Offline',
                                    style: TextStyle(
                                      color: Colors.orange.shade800,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Material(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  elevation: 4,
                  shadowColor: Colors.black26,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: _loadingBins || driverNotifier.isLoading ? null : _refreshAll,
                    child: Padding(
                      padding: const EdgeInsets.all(11),
                      child: _loadingBins || driverNotifier.isLoading
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
          ),

          // 3. FLOATING MAP LEGEND (BOTTOM-LEFT)
          if (_selectedBin == null)
            Positioned(
              bottom: 24,
              left: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.94),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: const [
                    BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _LegendDot(color: Color(0xFF16A34A), label: '<50%'),
                    SizedBox(width: 10),
                    _LegendDot(color: Color(0xFFF59E0B), label: '50-79%'),
                    SizedBox(width: 10),
                    _LegendDot(color: Color(0xFFEF4444), label: '≥80%'),
                  ],
                ),
              ),
            ),

          // 4. MAP CONTROLS (FIT BOUNDS, YAOUNDE, MY LOCATION)
          Positioned(
            right: 16,
            bottom: _selectedBin != null ? 330 : 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Server Config / Diagnostics
                FloatingActionButton.small(
                  heroTag: 'map_server_diag',
                  backgroundColor: Colors.white,
                  foregroundColor: AppTheme.darkText,
                  elevation: 4,
                  onPressed: _showServerDiagnosticsSheet,
                  child: const Icon(Icons.dns_outlined, size: 19),
                ),
                const SizedBox(height: 10),
                // Fit All Bins Button
                FloatingActionButton.small(
                  heroTag: 'map_fit_bounds',
                  backgroundColor: Colors.white,
                  foregroundColor: AppTheme.darkText,
                  elevation: 4,
                  onPressed: _fitMapBounds,
                  child: const Icon(Icons.center_focus_strong_rounded, size: 20),
                ),
                const SizedBox(height: 10),
                // Yaoundé Recenter
                FloatingActionButton.small(
                  heroTag: 'map_yaounde_center',
                  backgroundColor: Colors.white,
                  foregroundColor: AppTheme.darkText,
                  elevation: 4,
                  onPressed: _recenterYaounde,
                  child: const Icon(Icons.location_city_rounded, size: 20),
                ),
                const SizedBox(height: 14),
                // My Location Button
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

          // 5. SELECTED BIN DETAILS CARD (BOTTOM SHEET)
          if (_selectedBin != null)
            Positioned(
              bottom: 20,
              left: 16,
              right: 16,
              child: _buildBinDetailsCard(_selectedBin!, _associatedTask, driverNotifier),
            ),
        ],
      ),
    );
  }

  /// Bottom Sheet Card for Selected Bin & Collection Task Action
  Widget _buildBinDetailsCard(
    BinMapItem bin,
    TaskEntity? task,
    DriverNotifier notifier,
  ) {
    final isCritical = bin.currentFillLevel >= 80;
    final isWarning = bin.currentFillLevel >= 50 && bin.currentFillLevel < 80;
    final fillPercent = (bin.currentFillLevel / 100.0).clamp(0.0, 1.0);

    Color fillBarColor = const Color(0xFF16A34A);
    if (isCritical) {
      fillBarColor = const Color(0xFFEF4444);
    } else if (isWarning) {
      fillBarColor = const Color(0xFFF59E0B);
    }

    return Card(
      elevation: 10,
      shadowColor: Colors.black38,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // HEADER: Bin Code & Close
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isCritical
                            ? Colors.red.shade50
                            : (isWarning ? Colors.orange.shade50 : Colors.green.shade50),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.delete_sweep_rounded,
                        color: isCritical
                            ? Colors.red
                            : (isWarning ? Colors.orange.shade800 : AppTheme.primaryEmerald),
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          bin.binCode,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
                        ),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                bin.status,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: bin.status == 'ACTIVE' ? Colors.green.shade700 : Colors.red.shade700,
                                ),
                              ),
                            ),
                            if (task != null) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryEmerald.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'TASK #${task.id}: ${task.status.name.toUpperCase()}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.primaryEmerald,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: AppTheme.greyText, size: 22),
                  onPressed: () => setState(() {
                    _selectedBin = null;
                    _associatedTask = null;
                  }),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // ADDRESS / LOCATION
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_outlined, size: 17, color: AppTheme.greyText),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    bin.address.isNotEmpty
                        ? bin.address
                        : '${bin.latitude.toStringAsFixed(5)}°, ${bin.longitude.toStringAsFixed(5)}° (Yaoundé)',
                    style: const TextStyle(color: AppTheme.darkText, fontSize: 13, height: 1.3),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // FILL LEVEL PROGRESS BAR
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Fill Level:', style: TextStyle(fontSize: 12, color: AppTheme.greyText, fontWeight: FontWeight.w600)),
                Text(
                  '${bin.currentFillLevel}% ${isCritical ? "(CRITICAL)" : (isWarning ? "(HIGH)" : "Capacity")}',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                    color: fillBarColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: fillPercent,
                minHeight: 8,
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(fillBarColor),
              ),
            ),

            const SizedBox(height: 16),

            // ACTION BUTTON (IF TASK IS ASSIGNED TO DRIVER)
            if (task != null)
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
                  label: Text(
                    task.status == TaskStatus.inProgress
                        ? 'Mark as Emptied & Complete'
                        : 'Start Collection Route',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                  ),
                  onPressed: () async {
                    if (task.status == TaskStatus.inProgress) {
                      await notifier.updateStatus(task.id, TaskStatus.completed);
                      await _fetchRealBins();
                      setState(() {
                        _selectedBin = null;
                        _associatedTask = null;
                      });
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Collection completed successfully!')),
                        );
                      }
                    } else {
                      await notifier.updateStatus(task.id, TaskStatus.inProgress);
                      setState(() {
                        _associatedTask = TaskEntity(
                          id: task.id,
                          binId: task.binId,
                          location: task.location,
                          latitude: task.latitude,
                          longitude: task.longitude,
                          fillLevel: task.fillLevel,
                          priority: task.priority,
                          status: TaskStatus.inProgress,
                          assignedTime: task.assignedTime,
                        );
                      });
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Collection route started!')),
                        );
                      }
                    }
                  },
                ),
              )
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: const Center(
                  child: Text(
                    'No active dispatch task assigned for this bin.',
                    style: TextStyle(color: AppTheme.greyText, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// Server Configuration & Connection Diagnostics Modal Sheet
  void _showServerDiagnosticsSheet() {
    final controller = TextEditingController(text: ApiConfig.baseUrl);
    bool probing = false;
    DiagnosticReport? report;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
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
                  const SizedBox(height: 6),
                  Text(
                    'Current Server: ${ApiConfig.baseUrl}',
                    style: const TextStyle(color: AppTheme.greyText, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: controller,
                    decoration: InputDecoration(
                      labelText: 'Server Base URL',
                      hintText: 'http://<PC-LAN-IP>:3000',
                      prefixIcon: const Icon(Icons.dns_outlined),
                      suffixIcon: IconButton(
                        icon: probing
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.search_rounded),
                        onPressed: () async {
                          setModalState(() {
                            probing = true;
                            report = null;
                          });
                          final found = await ApiConfig.discoverLanBackend();
                          if (found != null) {
                            controller.text = found;
                            final rep = await ApiConfig.testConnectionDetails(found);
                            setModalState(() {
                              probing = false;
                              report = rep;
                            });
                          } else {
                            setModalState(() {
                              probing = false;
                              report = const DiagnosticReport(
                                status: NetworkDiagnosticStatus.unknownError,
                                isSuccess: false,
                                title: 'Auto-Discovery Failed',
                                message: 'Could not auto-detect backend. Please enter your PC\'s Wi-Fi IP manually.',
                                suggestions: [
                                  'Run "ipconfig" on your PC to find your IPv4 address',
                                  'Enter format: http://192.168.x.x:3000',
                                ],
                              );
                            });
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.devices_rounded, size: 14),
                        label: const Text('Emulator (10.0.2.2)'),
                        onPressed: () {
                          controller.text = ApiConfig.emulatorDefaultUrl;
                          setModalState(() => report = null);
                        },
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.usb_rounded, size: 14),
                        label: const Text('USB ADB (127.0.0.1)'),
                        onPressed: () {
                          controller.text = ApiConfig.localhostUrl;
                          setModalState(() => report = null);
                        },
                      ),
                    ],
                  ),
                  if (report != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: report!.isSuccess ? Colors.green.shade50 : Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: report!.isSuccess ? Colors.green.shade300 : Colors.red.shade300,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                report!.isSuccess ? Icons.check_circle_rounded : Icons.error_outline_rounded,
                                color: report!.isSuccess ? Colors.green.shade700 : Colors.red.shade700,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                report!.title,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: report!.isSuccess ? Colors.green.shade900 : Colors.red.shade900,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            report!.message,
                            style: TextStyle(
                              fontSize: 12,
                              color: report!.isSuccess ? Colors.green.shade900 : Colors.red.shade900,
                            ),
                          ),
                          if (report!.suggestions.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            ...report!.suggestions.map(
                              (s) => Padding(
                                padding: const EdgeInsets.only(bottom: 2),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('• ', style: TextStyle(fontSize: 11, color: Colors.red.shade800)),
                                    Expanded(
                                      child: Text(
                                        s,
                                        style: TextStyle(fontSize: 11, color: Colors.red.shade800),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: probing
                              ? null
                              : () async {
                                  setModalState(() {
                                    probing = true;
                                    report = null;
                                  });
                                  final rep = await ApiConfig.testConnectionDetails(controller.text);
                                  setModalState(() {
                                    probing = false;
                                    report = rep;
                                  });
                                },
                          child: const Text('Test Connection'),
                        ),
                      ),
                      const SizedBox(width: 12),
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
                              if (!mounted) return;
                              setState(() {});
                              _fetchRealBins();
                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Server endpoint saved: $target'),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
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

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.darkText),
        ),
      ],
    );
  }
}
