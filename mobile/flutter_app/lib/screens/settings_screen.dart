import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_providers.dart';
import '../services/chat_service.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _chatService = ChatService();
  final Map<String, bool> _validating = {};
  final Map<String, bool> _valid = {};

  @override
  Widget build(BuildContext context) {
    final providers = ref.watch(providersListProvider);
    final preferences = ref.watch(preferencesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // API Keys section
            _SectionHeader(title: 'API Keys', icon: Icons.vpn_key_outlined),
            const SizedBox(height: 8),
            ...providers.map((p) => _ApiKeyCard(
                  provider: p,
                  isValid: _valid[p.id],
                  isValidating: _validating[p.id] ?? false,
                  onValidate: (key) => _validateKey(p.id, key, p.baseUrl),
                  onKeyChanged: (key) => ref.read(providersListProvider.notifier).setApiKey(p.id, key),
                )),

            const SizedBox(height: 24),

            // Budget section
            _SectionHeader(title: 'Budget & Limits', icon: Icons.account_balance_wallet_outlined),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Monthly Budget'),
                        Text('\$${preferences.budgetLimit.toStringAsFixed(0)}',
                            style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Slider(
                      value: preferences.budgetLimit,
                      min: 0,
                      max: 100,
                      divisions: 20,
                      label: '\$${preferences.budgetLimit.toStringAsFixed(0)}',
                      onChanged: (v) {
                        ref.read(preferencesProvider.notifier).update((p) => p.copyWith(budgetLimit: v));
                      },
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Features section
            _SectionHeader(title: 'Features', icon: Icons.tune),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: [
                  SwitchListTile(
                    title: const Text('Sentiment Analysis'),
                    subtitle: const Text('Analyze message sentiment in real-time'),
                    value: preferences.sentimentEnabled,
                    onChanged: (v) {
                      ref.read(preferencesProvider.notifier).update((p) => p.copyWith(sentimentEnabled: v));
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Language Detection'),
                    subtitle: const Text('Auto-detect message language'),
                    value: preferences.languageDetectionEnabled,
                    onChanged: (v) {
                      ref.read(preferencesProvider.notifier).update((p) => p.copyWith(languageDetectionEnabled: v));
                    },
                  ),
                  SwitchListTile(
                    title: const Text('RAG (Knowledge Base)'),
                    subtitle: const Text('Use documents for context-aware responses'),
                    value: preferences.ragEnabled,
                    onChanged: (v) {
                      ref.read(preferencesProvider.notifier).update((p) => p.copyWith(ragEnabled: v));
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Long-term Memory'),
                    subtitle: const Text('Remember context across conversations'),
                    value: preferences.memoryEnabled,
                    onChanged: (v) {
                      ref.read(preferencesProvider.notifier).update((p) => p.copyWith(memoryEnabled: v));
                    },
                  ),
                  SwitchListTile(
                    title: const Text('Privacy Mode'),
                    subtitle: const Text('No data sent to third parties'),
                    value: preferences.privacyMode,
                    onChanged: (v) {
                      ref.read(preferencesProvider.notifier).update((p) => p.copyWith(privacyMode: v));
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Theme section
            _SectionHeader(title: 'Appearance', icon: Icons.palette_outlined),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                title: const Text('Theme'),
                trailing: DropdownButton<ThemeMode>(
                  value: ref.watch(themeModeProvider),
                  underline: const SizedBox(),
                  items: const [
                    DropdownMenuItem(value: ThemeMode.system, child: Text('System')),
                    DropdownMenuItem(value: ThemeMode.light, child: Text('Light')),
                    DropdownMenuItem(value: ThemeMode.dark, child: Text('Dark')),
                  ],
                  onChanged: (mode) {
                    if (mode != null) ref.read(themeModeProvider.notifier).state = mode;
                  },
                ),
              ),
            ),

            const SizedBox(height: 24),

            // About section
            _SectionHeader(title: 'About', icon: Icons.info_outline),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: [
                  ListTile(
                    title: const Text('AI Hub Mobile'),
                    subtitle: const Text('v1.0.0  •  Flutter + Rust'),
                  ),
                  ListTile(
                    title: const Text('License'),
                    subtitle: const Text('MIT'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Future<void> _validateKey(String providerId, String key, String baseUrl) async {
    setState(() => _validating[providerId] = true);
    try {
      final isValid = await _chatService.validateKey(providerId, key, baseUrl: providerId == 'custom' ? baseUrl : null);
      setState(() {
        _valid[providerId] = isValid;
        _validating[providerId] = false;
      });
      ref.read(providersListProvider.notifier).setConnected(providerId, isValid);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isValid ? '$providerId key is valid!' : '$providerId key is invalid'),
            backgroundColor: isValid ? Colors.green : Colors.red,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _valid[providerId] = false;
        _validating[providerId] = false;
      });
    }
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 8),
        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _ApiKeyCard extends StatefulWidget {
  final ProviderInfo provider;
  final bool? isValid;
  final bool isValidating;
  final Future<void> Function(String key) onValidate;
  final void Function(String key) onKeyChanged;

  const _ApiKeyCard({
    required this.provider,
    this.isValid,
    required this.isValidating,
    required this.onValidate,
    required this.onKeyChanged,
  });

  @override
  State<_ApiKeyCard> createState() => _ApiKeyCardState();
}

class _ApiKeyCardState extends State<_ApiKeyCard> {
  final _keyController = TextEditingController();
  bool _obscureKey = true;

  @override
  void dispose() {
    _keyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(widget.provider.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
                if (widget.isValid == true)
                  const Icon(Icons.check_circle, color: Colors.green, size: 18),
                if (widget.isValid == false)
                  const Icon(Icons.cancel, color: Colors.red, size: 18),
                if (widget.isValidating)
                  const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              ],
            ),
            if (widget.provider.apiKeyPrefix != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text('Prefix: ${widget.provider.apiKeyPrefix}',
                    style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _keyController,
                    obscureText: _obscureKey,
                    decoration: InputDecoration(
                      hintText: 'Enter API key',
                      suffixIcon: IconButton(
                        icon: Icon(_obscureKey ? Icons.visibility_off : Icons.visibility, size: 18),
                        onPressed: () => setState(() => _obscureKey = !_obscureKey),
                      ),
                    ),
                    onChanged: widget.onKeyChanged,
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton.tonal(
                  onPressed: _keyController.text.isEmpty ? null : () => widget.onValidate(_keyController.text),
                  child: const Text('Test'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
