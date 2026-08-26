import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/config/api_config.dart';
import '../../core/constants/app_strings.dart';
import '../../core/constants/app_assets.dart';
import '../../core/routes/app_routes.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/validators.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../widgets/binova_card.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isPasswordVisible = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      final authNotifier = context.read<AuthNotifier>();
      await authNotifier.login(
        _emailController.text.trim(),
        _passwordController.text.trim(),
      );

      if (authNotifier.status == AuthStatus.error) {
        if (mounted) {
          final isConnErr = authNotifier.errorMessage?.toLowerCase().contains('server') == true ||
              authNotifier.errorMessage?.toLowerCase().contains('reach') == true;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(authNotifier.errorMessage ?? 'Login failed'),
              backgroundColor: Colors.redAccent,
              behavior: SnackBarBehavior.floating,
              action: isConnErr
                  ? SnackBarAction(
                      label: 'Server IP',
                      textColor: Colors.white,
                      onPressed: _showServerConfigDialog,
                    )
                  : null,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authNotifier = context.watch<AuthNotifier>();
    final isLoading = authNotifier.status == AuthStatus.loading;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.darkText),
          onPressed: () => context.pop(),
        ),
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: AppTheme.meshGradient,
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(height: 20),
                  Hero(
                    tag: 'logo',
                    child: Image.asset(
                      AppAssets.logo,
                      height: 120,
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'Welcome Back 🌿',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Login to continue to Binova',
                    style: TextStyle(color: AppTheme.greyText),
                  ),
                  const SizedBox(height: 48),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    enabled: !isLoading,
                    decoration: const InputDecoration(
                      hintText: 'Enter your email',
                      prefixIcon: Icon(Icons.email_outlined),
                    ),
                    validator: Validators.validateEmail,
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: !_isPasswordVisible,
                    enabled: !isLoading,
                    decoration: InputDecoration(
                      hintText: 'Enter your password',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _isPasswordVisible ? Icons.visibility_off : Icons.visibility,
                        ),
                        onPressed: () => setState(() => _isPasswordVisible = !_isPasswordVisible),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'Please enter your password';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Checkbox(
                            value: true,
                            onChanged: (v) {},
                            activeColor: AppTheme.primaryEmerald,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                          ),
                          const Text('Remember me', style: TextStyle(fontSize: 14)),
                        ],
                      ),
                      TextButton(
                        onPressed: isLoading ? null : () => context.push(AppRoutes.forgotPassword),
                        child: const Text(
                          AppStrings.forgotPassword,
                          style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryEmerald),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  Container(
                    width: double.infinity,
                    height: 56,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      gradient: isLoading ? null : AppTheme.primaryGradient,
                      color: isLoading ? Colors.grey : null,
                      boxShadow: isLoading
                          ? []
                          : [
                              BoxShadow(
                                color: AppTheme.primaryEmerald.withOpacity(0.3),
                                blurRadius: 15,
                                offset: const Offset(0, 8),
                              ),
                            ],
                    ),
                    child: ElevatedButton(
                      onPressed: isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                      ),
                      child: isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(AppStrings.login, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                SizedBox(width: 8),
                                Icon(Icons.arrow_forward, size: 20),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 40),
                  const Row(
                    children: [
                      Expanded(child: Divider()),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16),
                        child: Text('Authorized Agents Only', style: TextStyle(color: AppTheme.greyText, fontSize: 12)),
                      ),
                      Expanded(child: Divider()),
                    ],
                  ),
                  const SizedBox(height: 32),
                  _buildSafetyBanner(),
                  const SizedBox(height: 20),
                  _buildServerStatusChip(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildServerStatusChip() {
    return Center(
      child: InkWell(
        onTap: _showServerConfigDialog,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_tethering, size: 14, color: AppTheme.primaryEmerald),
              const SizedBox(width: 6),
              Text(
                'Server: ${ApiConfig.baseUrl}',
                style: const TextStyle(fontSize: 11, color: AppTheme.darkText, fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.settings_outlined, size: 12, color: AppTheme.greyText),
            ],
          ),
        ),
      ),
    );
  }

  void _showServerConfigDialog() {
    final controller = TextEditingController(text: ApiConfig.baseUrl);
    bool testing = false;
    String? testResult;
    bool? testSuccess;

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
                        'Backend Server Configuration',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Select or enter the URL where the BINOVA Node.js backend is running.',
                    style: TextStyle(color: AppTheme.greyText, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: controller,
                    decoration: InputDecoration(
                      labelText: 'Server Base URL',
                      hintText: 'http://192.168.4.77:3000',
                      prefixIcon: const Icon(Icons.dns_outlined),
                      suffixIcon: IconButton(
                        icon: testing
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.refresh),
                        onPressed: () async {
                          setModalState(() {
                            testing = true;
                            testResult = null;
                            testSuccess = null;
                          });
                          final working = await ApiConfig.probeBestUrl();
                          if (working != null) {
                            controller.text = working;
                            testResult = 'Auto-detected active server: $working';
                            testSuccess = true;
                          } else {
                            testResult = 'Auto-detect failed. Enter IP manually.';
                            testSuccess = false;
                          }
                          setModalState(() {
                            testing = false;
                          });
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
                        label: const Text('Wi-Fi LAN (192.168.4.77)'),
                        onPressed: () {
                          controller.text = ApiConfig.lanWifiUrl;
                          setModalState(() {
                            testResult = null;
                          });
                        },
                      ),
                      ActionChip(
                        label: const Text('USB ADB (127.0.0.1)'),
                        onPressed: () {
                          controller.text = ApiConfig.localhostUrl;
                          setModalState(() {
                            testResult = null;
                          });
                        },
                      ),
                      ActionChip(
                        label: const Text('Emulator (10.0.2.2)'),
                        onPressed: () {
                          controller.text = ApiConfig.emulatorDefaultUrl;
                          setModalState(() {
                            testResult = null;
                          });
                        },
                      ),
                    ],
                  ),
                  if (testResult != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: testSuccess == true ? Colors.green.shade50 : Colors.red.shade50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: testSuccess == true ? Colors.green.shade300 : Colors.red.shade300,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            testSuccess == true ? Icons.check_circle : Icons.error_outline,
                            color: testSuccess == true ? Colors.green : Colors.red,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              testResult!,
                              style: TextStyle(
                                fontSize: 12,
                                color: testSuccess == true ? Colors.green.shade900 : Colors.red.shade900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: testing
                              ? null
                              : () async {
                                  setModalState(() {
                                    testing = true;
                                    testResult = null;
                                  });
                                  final ok = await ApiConfig.testUrl(controller.text);
                                  setModalState(() {
                                    testing = false;
                                    testSuccess = ok;
                                    testResult = ok
                                        ? 'Connection successful! (HTTP 200 OK)'
                                        : 'Could not connect to ${controller.text}';
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
                              if (mounted) setState(() {});
                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Server set to: $target'),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            }
                          },
                          child: const Text('Save'),
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

  Widget _buildSafetyBanner() {
    return BinovaCard(
      padding: const EdgeInsets.all(16),
      color: AppTheme.softMint.withValues(alpha: 0.5),
      border: Border.all(color: AppTheme.primaryEmerald.withValues(alpha: 0.1)),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.shield_outlined, color: AppTheme.primaryEmerald, size: 20),
          ),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Your data is safe with us',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.darkText),
                ),
                Text(
                  'We protect your information with advanced security.',
                  style: TextStyle(fontSize: 11, color: AppTheme.greyText),
                ),
              ],
            ),
          ),
          const Icon(Icons.lock_outline, color: AppTheme.primaryEmerald, size: 20),
        ],
      ),
    );
  }
}
