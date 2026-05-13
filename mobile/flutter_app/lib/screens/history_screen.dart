import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_providers.dart';

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversations = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('History'),
        actions: [
          if (conversations.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Clear All History'),
                    content: const Text('This will delete all conversations. This action cannot be undone.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                      FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: Colors.red),
                        onPressed: () {
                          // Clear all conversations
                          for (final c in conversations) {
                            ref.read(conversationsProvider.notifier).deleteConversation(c.id);
                          }
                          ref.read(activeConversationProvider.notifier).state = null;
                          Navigator.pop(ctx);
                        },
                        child: const Text('Delete All'),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
      body: conversations.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.history_outlined, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  const Text('No conversations yet', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 8),
                  const Text('Start a chat to see it here', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: conversations.length,
              itemBuilder: (context, index) {
                final conv = conversations[index];
                return Card(
                  child: Dismissible(
                    key: Key(conv.id),
                    direction: DismissDirection.endToStart,
                    onDismissed: (_) {
                      ref.read(conversationsProvider.notifier).deleteConversation(conv.id);
                    },
                    background: Container(
                      alignment: Alignment.centerRight,
                      padding: const EdgeInsets.only(right: 16),
                      color: Colors.red,
                      child: const Icon(Icons.delete, color: Colors.white),
                    ),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                        child: _providerIcon(conv.provider),
                      ),
                      title: Text(conv.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Row(
                        children: [
                          Chip(
                            label: Text(conv.provider, style: const TextStyle(fontSize: 10)),
                            visualDensity: VisualDensity.compact,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${conv.messageCount} msgs',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                      trailing: PopupMenuButton(
                        itemBuilder: (ctx) => [
                          const PopupMenuItem(value: 'open', child: Text('Open')),
                          const PopupMenuItem(value: 'rename', child: Text('Rename')),
                          const PopupMenuItem(value: 'export', child: Text('Export')),
                          const PopupMenuItem(value: 'delete', child: Text('Delete')),
                        ],
                        onSelected: (value) {
                          switch (value) {
                            case 'open':
                              ref.read(activeConversationProvider.notifier).state = conv;
                              ref.read(currentTabProvider.notifier).state = 0; // Switch to Chat tab
                              break;
                            case 'rename':
                              _showRenameDialog(context, ref, conv);
                              break;
                            case 'delete':
                              ref.read(conversationsProvider.notifier).deleteConversation(conv.id);
                              break;
                          }
                        },
                      ),
                      onTap: () {
                        ref.read(activeConversationProvider.notifier).state = conv;
                        ref.read(currentTabProvider.notifier).state = 0;
                      },
                    ),
                  ),
                );
              },
            ),
    );
  }

  Icon _providerIcon(String provider) {
    switch (provider) {
      case 'openrouter': return const Icon(Icons.route);
      case 'nvidia': return const Icon(Icons.memory);
      case 'openai': return const Icon(Icons.smart_toy);
      case 'anthropic': return const Icon(Icons.auto_awesome);
      case 'google': return const Icon(Icons.search);
      case 'groq': return const Icon(Icons.bolt);
      case 'together': return const Icon(Icons.group_work);
      case 'ollama': return const Icon(Icons.computer);
      default: return const Icon(Icons.api);
    }
  }

  void _showRenameDialog(BuildContext context, WidgetRef ref, dynamic conv) {
    final ctrl = TextEditingController(text: conv.title);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rename Conversation'),
        content: TextField(controller: ctrl, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              if (ctrl.text.isNotEmpty) {
                ref.read(conversationsProvider.notifier).renameConversation(conv.id, ctrl.text);
              }
              Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
