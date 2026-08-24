import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../features/driver/presentation/providers/driver_provider.dart';

class DriverMapScreen extends StatefulWidget {
  const DriverMapScreen({super.key});

  @override
  State<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends State<DriverMapScreen> {
  GoogleMapController? _controller;

  @override
  Widget build(BuildContext context) {
    final driverNotifier = context.watch<DriverNotifier>();

    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: const CameraPosition(
              target: LatLng(3.8480, 11.5021), // Yaoundé
              zoom: 13,
            ),
            onMapCreated: (controller) => _controller = controller,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            markers: _buildMarkers(driverNotifier),
          ),
          
          Positioned(
            top: 60,
            left: 20,
            child: FloatingActionButton.small(
              onPressed: () {}, // Menu or Back
              backgroundColor: Colors.white,
              child: const Icon(Icons.menu_rounded, color: AppTheme.darkText),
            ),
          ),
          
          if (driverNotifier.tasks.isEmpty)
             const Center(
               child: Card(
                 margin: EdgeInsets.all(24),
                 child: Padding(
                   padding: EdgeInsets.all(16),
                   child: Text('No assigned collection locations yet.', style: TextStyle(color: AppTheme.greyText)),
                 ),
               ),
             ),
        ],
      ),
    );
  }

  Set<Marker> _buildMarkers(DriverNotifier notifier) {
    return notifier.tasks.map((task) => Marker(
      markerId: MarkerId(task.id),
      position: LatLng(task.latitude, task.longitude),
      icon: BitmapDescriptor.defaultMarkerWithHue(
        task.fillLevel > 80 ? BitmapDescriptor.hueRed : BitmapDescriptor.hueGreen,
      ),
      infoWindow: InfoWindow(title: 'Bin ${task.binId}', snippet: task.location),
    )).toSet();
  }
}
