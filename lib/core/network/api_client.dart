import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiClient {
  final Dio dio;

  ApiClient._internal(this.dio) {
    dio.options.baseUrl = ApiConfig.baseUrl;
    dio.options.connectTimeout = const Duration(seconds: 15);
    dio.options.receiveTimeout = const Duration(seconds: 15);
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          options.baseUrl = ApiConfig.baseUrl;
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('auth_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (e, handler) async {
          if (e.response?.statusCode == 401) {
            final prefs = await SharedPreferences.getInstance();
            await prefs.remove('auth_token');
            await prefs.remove('auth_user');
            return handler.next(e);
          }

          final msg = (e.message ?? '').toLowerCase();
          final isNetworkIssue = e.type == DioExceptionType.connectionError ||
              e.type == DioExceptionType.connectionTimeout ||
              e.type == DioExceptionType.sendTimeout ||
              e.type == DioExceptionType.receiveTimeout ||
              msg.contains('no route to host') ||
              msg.contains('socketexception') ||
              msg.contains('connection refused');

          if (isNetworkIssue && e.requestOptions.extra['retried_failover'] != true) {
            final workingUrl = await ApiConfig.probeBestUrl();
            if (workingUrl != null && workingUrl != e.requestOptions.baseUrl) {
              try {
                final options = e.requestOptions;
                options.baseUrl = workingUrl;
                options.extra['retried_failover'] = true;
                final response = await dio.fetch(options);
                return handler.resolve(response);
              } catch (retryErr) {
                if (retryErr is DioException) {
                  return handler.next(retryErr);
                }
              }
            }
          }

          return handler.next(e);
        },
      ),
    );
  }

  static final ApiClient _instance = ApiClient._internal(Dio());

  factory ApiClient() => _instance;
}

