import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_providers.dart';

class ProviderSelector extends ConsumerWidget {
  const ProviderSelector({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final providers = ref.watch(providersListProvider);
    final activeProvider = ref.watch(activeProviderProvider);
    final activeModel = ref.watch(activeModelProvider);

    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          // Provider dropdown
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButton<String>(
              value: activeProvider,
              underline: const SizedBox(),
              iconSize: 16,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
              items: providers.map((p) => DropdownMenuItem(
                value: p.id,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (p.isConnected)
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                      ),
                    Text(p.name),
                  ],
                ),
              )).toList(),
              onChanged: (v) {
                if (v != null) ref.read(activeProviderProvider.notifier).state = v;
              },
            ),
          ),
          const SizedBox(width: 8),
          // Model dropdown
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: DropdownButton<String>(
                value: activeModel,
                underline: const SizedBox(),
                iconSize: 16,
                isExpanded: true,
                style: const TextStyle(fontSize: 12),
                items: _getModelsForProvider(activeProvider).map((m) => DropdownMenuItem(
                  value: m,
                  child: Text(m, overflow: TextOverflow.ellipsis),
                )).toList(),
                onChanged: (v) {
                  if (v != null) ref.read(activeModelProvider.notifier).state = v;
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<String> _getModelsForProvider(String provider) {
    switch (provider) {
      case 'openrouter':
        return ['openai/gpt-3.5-turbo', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro', 'meta-llama/llama-3-70b'];
      case 'nvidia':
        return ['meta/llama-3.1-405b-instruct', 'nvidia/llama-3.1-nemotron-70b-instruct', 'mistralai/mixtral-8x22b-instruct'];
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      case 'anthropic':
        return ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];
      case 'google':
        return ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
      case 'groq':
        return ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
      case 'together':
        return ['meta-llama/Llama-3-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'];
      case 'ollama':
        return ['llama3', 'mistral', 'codellama', 'phi3'];
      case 'custom':
        return ['default'];
      default:
        return ['default'];
    }
  }
}
