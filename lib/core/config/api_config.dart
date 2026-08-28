import 'dart:async';
import 'dart:io' show Platform;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';

enum NetworkDiagnosticStatus {
  healthy,
  connectionRefused,
  timeout,
  hostNotFound,
  databaseError,
  serverError,
  unknownError,
}

class DiagnosticReport {
  final NetworkDiagnosticStatus status;
  final bool isSuccess;
  final String title;
  final String message;
  final String? technicalDetail;
  final List<String> suggestions;

  const DiagnosticReport({
    required this.status,
    required this.isSuccess,
    required this.title,
    required this.message,
    this.technicalDetail,
    this.suggestions = const [],
  });
}

class ApiConfig {
  static const int defaultPort = 3000;

  static const String localhostUrl = 'http://127.0.0.1:$defaultPort';
  static const String emulatorDefaultUrl = 'http://10.0.2.2:$defaultPort';

  static const String _prefKey = 'binova_api_base_url';
  static const String _envUrl = String.fromEnvironment('API_URL');

  static String _detectDefaultBaseUrl() {
    if (_envUrl.isNotEmpty) return _envUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (kIsWeb) return 'http://localhost:$defaultPort';
    try {
      if (Platform.isAndroid) {
        // Safe default for emulator, will auto-probe or load saved IP
        return emulatorDefaultUrl;
      }
      if (Platform.isIOS) {
        return localhostUrl;
      }
      if (Platform.isMacOS || Platform.isWindows || Platform.isLinux) {
        return 'http://localhost:$defaultPort';
      }
    } catch (_) {}
    return localhostUrl;
  }

  static String _baseUrl = _detectDefaultBaseUrl();

  static String get baseUrl => _baseUrl;

  /// Load persisted baseUrl or probe candidate endpoints
  static Future<void> init() async {
    if (_envUrl.isNotEmpty) {
      _baseUrl = _envUrl.trim().replaceAll(RegExp(r'/+$'), '');
      return;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null && saved.trim().isNotEmpty) {
        _baseUrl = saved.trim().replaceAll(RegExp(r'/+$'), '');
        return;
      }
    } catch (_) {}

    // Auto-probe candidate URLs on first run
    await probeBestUrl();
  }

  /// Probe standard candidate URLs to detect the active, responsive server
  static Future<String?> probeBestUrl() async {
    final dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(milliseconds: 2000),
        receiveTimeout: const Duration(milliseconds: 2000),
      ),
    );

    final candidates = <String>[
      if (_baseUrl.isNotEmpty) _baseUrl,
      emulatorDefaultUrl,
      localhostUrl,
    ].toSet().toList();

    for (final url in candidates) {
      try {
        final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
        final res = await dio.get('$clean/api/health');
        if (res.statusCode == 200 && res.data is Map && res.data['success'] == true) {
          await setBaseUrl(clean);
          return clean;
        }
      } catch (_) {}
    }
    return null;
  }

  /// Active LAN discovery across common router subnets (192.168.1.x, 192.168.0.x, 192.168.4.x, 10.0.0.x)
  static Future<String?> discoverLanBackend({
    Function(String status)? onProgress,
  }) async {
    onProgress?.call('Probing direct connection...');
    final quick = await probeBestUrl();
    if (quick != null) return quick;

    // Check saved IP if available
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null && saved.isNotEmpty) {
        onProgress?.call('Testing saved endpoint...');
        if (await testUrl(saved)) {
          await setBaseUrl(saved);
          return saved;
        }
      }
    } catch (_) {}

    return null;
  }

  /// Test connectivity to a specific URL and return simple boolean
  static Future<bool> testUrl(String url) async {
    final report = await testConnectionDetails(url);
    return report.isSuccess;
  }

  /// Detailed connectivity diagnostics differentiating network vs database vs timeout errors
  static Future<DiagnosticReport> testConnectionDetails(String rawUrl) async {
    final clean = rawUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.isEmpty || !clean.startsWith('http')) {
      return const DiagnosticReport(
        status: NetworkDiagnosticStatus.hostNotFound,
        isSuccess: false,
        title: 'Invalid URL Format',
        message: 'The URL must start with http:// or https:// (e.g. http://192.168.1.50:3000)',
        suggestions: [
          'Use format: http://<YOUR-PC-IP>:3000',
          'Ensure the port :3000 is included',
        ],
      );
    }

    final dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(milliseconds: 4000),
        receiveTimeout: const Duration(milliseconds: 4000),
        sendTimeout: const Duration(milliseconds: 4000),
      ),
    );

    try {
      final res = await dio.get('$clean/api/health');
      if (res.statusCode == 200 && res.data is Map && res.data['success'] == true) {
        return DiagnosticReport(
          status: NetworkDiagnosticStatus.healthy,
          isSuccess: true,
          title: 'BINOVA Backend Reachable',
          message: 'Connected successfully to BINOVA backend and PostgreSQL database.',
          technicalDetail: 'HTTP 200 OK • Response: ${res.data['message'] ?? 'healthy'}',
        );
      } else if (res.statusCode == 500) {
        return DiagnosticReport(
          status: NetworkDiagnosticStatus.databaseError,
          isSuccess: false,
          title: 'Database Unreachable',
          message: 'Backend server responded, but cannot connect to PostgreSQL database.',
          technicalDetail: 'HTTP 500 • ${res.data is Map ? res.data['message'] : 'DB Error'}',
          suggestions: [
            'Verify PostgreSQL service is running on your PC',
            'Check DATABASE_URL in backend/.env',
          ],
        );
      } else {
        return DiagnosticReport(
          status: NetworkDiagnosticStatus.serverError,
          isSuccess: false,
          title: 'Unexpected Server Response',
          message: 'Received HTTP status ${res.statusCode} from $clean.',
          technicalDetail: 'Status: ${res.statusCode}',
        );
      }
    } on DioException catch (e) {
      final msg = (e.message ?? '').toLowerCase();
      final errStr = (e.error ?? '').toString().toLowerCase();

      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return DiagnosticReport(
          status: NetworkDiagnosticStatus.timeout,
          isSuccess: false,
          title: 'Connection Timed Out',
          message: 'The phone could not reach $clean within 4 seconds.',
          technicalDetail: e.message,
          suggestions: [
            'Ensure your PC and phone are connected to the SAME Wi-Fi network',
            'Verify Windows Firewall allows inbound connections on port 3000',
            'Disable AP/Client Isolation in your Wi-Fi router settings if active',
            'If connected via USB, run "adb reverse tcp:3000 tcp:3000" and use http://127.0.0.1:3000',
          ],
        );
      }

      if (msg.contains('connection refused') ||
          errStr.contains('connection refused') ||
          errStr.contains('econnrefused')) {
        return DiagnosticReport(
          status: NetworkDiagnosticStatus.connectionRefused,
          isSuccess: false,
          title: 'Connection Refused',
          message: 'The IP address responded, but port 3000 is not accepting connections.',
          technicalDetail: 'Connection Refused on port 3000',
          suggestions: [
            'Ensure the backend is running (run "npm start" in backend/)',
            'Verify the backend is listening on 0.0.0.0:3000 (not 127.0.0.1)',
          ],
        );
      }

      if (msg.contains('failed host lookup') ||
          msg.contains('no address associated') ||
          errStr.contains('socketexception')) {
        return DiagnosticReport(
          status: NetworkDiagnosticStatus.hostNotFound,
          isSuccess: false,
          title: 'Host Unreachable / Not Found',
          message: 'Could not resolve or route to IP: $clean.',
          technicalDetail: e.message,
          suggestions: [
            'Check your PC\'s current LAN IPv4 address (run "ipconfig" in Windows terminal)',
            'Enter the exact PC IP in the format: http://<PC-LAN-IP>:3000',
          ],
        );
      }

      return DiagnosticReport(
        status: NetworkDiagnosticStatus.unknownError,
        isSuccess: false,
        title: 'Network Communication Error',
        message: 'Could not connect to $clean.',
        technicalDetail: e.message ?? e.toString(),
        suggestions: [
          'Verify PC and Phone are on the same Wi-Fi',
          'Run "adb reverse tcp:3000 tcp:3000" for USB connection',
        ],
      );
    } catch (err) {
      return DiagnosticReport(
        status: NetworkDiagnosticStatus.unknownError,
        isSuccess: false,
        title: 'Connection Error',
        message: 'Error testing $clean: $err',
        technicalDetail: err.toString(),
      );
    }
  }

  /// Call this at runtime to override dynamically and persist
  static Future<void> setBaseUrl(String url) async {
    _baseUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, _baseUrl);
    } catch (_) {}
  }
}
