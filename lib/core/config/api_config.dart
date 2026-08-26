import 'dart:async';
import 'dart:io' show Platform;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  /// The active Wi-Fi LAN IPv4 address of the host PC running the BINOVA backend.
  static const String defaultPcLanIp = '192.168.4.77';
  static const int defaultPort = 3000;

  static const String lanWifiUrl = 'http://$defaultPcLanIp:$defaultPort';
  static const String localhostUrl = 'http://127.0.0.1:$defaultPort';
  static const String emulatorDefaultUrl = 'http://10.0.2.2:$defaultPort';

  static const String _prefKey = 'binova_api_base_url';
  static const String _envUrl = String.fromEnvironment('API_URL');

  static List<String> get candidateUrls => [
    localhostUrl,
    lanWifiUrl,
    emulatorDefaultUrl,
  ];

  static String _detectDefaultBaseUrl() {
    if (_envUrl.isNotEmpty) return _envUrl;
    if (kIsWeb) return 'http://localhost:$defaultPort';
    try {
      if (Platform.isAndroid || Platform.isIOS) {
        return lanWifiUrl;
      }
      if (Platform.isMacOS || Platform.isWindows || Platform.isLinux) {
        return 'http://localhost:$defaultPort';
      }
    } catch (_) {}
    return lanWifiUrl;
  }

  static String _baseUrl = _detectDefaultBaseUrl();

  static String get baseUrl => _baseUrl;

  /// Load persisted baseUrl or probe candidate endpoints
  static Future<void> init() async {
    if (_envUrl.isNotEmpty) {
      _baseUrl = _envUrl;
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

    // Auto-probe candidate URLs in the background
    await probeBestUrl();
  }

  /// Probe candidates to detect the active, responsive server
  static Future<String?> probeBestUrl() async {
    final dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(milliseconds: 2500),
        receiveTimeout: const Duration(milliseconds: 2500),
      ),
    );

    final list = <String>[
      if (_baseUrl.isNotEmpty) _baseUrl,
      ...candidateUrls,
    ].toSet().toList();

    for (final url in list) {
      try {
        final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
        final res = await dio.get('$clean/api/health');
        if (res.statusCode == 200 && res.data is Map && res.data['success'] == true) {
          await setBaseUrl(clean);
          return clean;
        }
      } catch (_) {
        // try next candidate
      }
    }
    return null;
  }

  /// Test connectivity to a specific URL
  static Future<bool> testUrl(String url) async {
    final dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(milliseconds: 3000),
        receiveTimeout: const Duration(milliseconds: 3000),
      ),
    );
    try {
      final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
      final res = await dio.get('$clean/api/health');
      return res.statusCode == 200 && res.data is Map && res.data['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Call this at app startup or runtime to override dynamically and persist
  static Future<void> setBaseUrl(String url) async {
    _baseUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, _baseUrl);
    } catch (_) {}
  }
}
