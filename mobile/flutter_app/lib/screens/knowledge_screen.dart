import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../providers/app_providers.dart';
import '../models/app_models.dart';

class KnowledgeScreen extends ConsumerStatefulWidget {
  const KnowledgeScreen({super.key});

  @override
  ConsumerState<KnowledgeScreen> createState() => _KnowledgeScreenState();
}

class _KnowledgeScreenState extends ConsumerState<KnowledgeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _uuid = const Uuid();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Knowledge & Memory'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.description_outlined), text: 'Documents'),
            Tab(icon: Icon(Icons.psychology_outlined), text: 'Memory'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _DocumentsTab(uuid: _uuid),
          _MemoryTab(uuid: _uuid),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showAddDialog(BuildContext context) {
    final isDocs = _tabController.index == 0;
    if (isDocs) {
      _showAddDocumentDialog(context);
    } else {
      _showAddMemoryDialog(context);
    }
  }

  void _showAddDocumentDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    final tagsCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Knowledge Document'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Title')),
              const SizedBox(height: 12),
              TextField(controller: contentCtrl, decoration: const InputDecoration(labelText: 'Content'), maxLines: 5),
              const SizedBox(height: 12),
              TextField(controller: tagsCtrl, decoration: const InputDecoration(labelText: 'Tags (comma-separated)')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              if (titleCtrl.text.isNotEmpty && contentCtrl.text.isNotEmpty) {
                ref.read(knowledgeProvider.notifier).addDocument(KnowledgeDocument(
                  id: _uuid.v4(),
                  title: titleCtrl.text,
                  content: contentCtrl.text,
                  tags: tagsCtrl.text.isNotEmpty ? tagsCtrl.text : null,
                  createdAt: DateTime.now(),
                  updatedAt: DateTime.now(),
                ));
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showAddMemoryDialog(BuildContext context) {
    final keyCtrl = TextEditingController();
    final valueCtrl = TextEditingController();
    final categoryCtrl = TextEditingController(text: 'general');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Memory Note'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: keyCtrl, decoration: const InputDecoration(labelText: 'Key')),
            const SizedBox(height: 12),
            TextField(controller: valueCtrl, decoration: const InputDecoration(labelText: 'Value'), maxLines: 3),
            const SizedBox(height: 12),
            TextField(controller: categoryCtrl, decoration: const InputDecoration(labelText: 'Category')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              if (keyCtrl.text.isNotEmpty && valueCtrl.text.isNotEmpty) {
                ref.read(memoriesProvider.notifier).addMemory(MemoryNote(
                  id: _uuid.v4(),
                  key: keyCtrl.text,
                  value: valueCtrl.text,
                  category: categoryCtrl.text,
                  createdAt: DateTime.now(),
                  updatedAt: DateTime.now(),
                ));
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

class _DocumentsTab extends ConsumerWidget {
  final Uuid uuid;
  const _DocumentsTab({required this.uuid});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final docs = ref.watch(knowledgeProvider);

    if (docs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.description_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            const Text('No documents yet', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 8),
            const Text('Add documents for RAG-powered chat', style: TextStyle(color: Colors.grey, fontSize: 12)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: docs.length,
      itemBuilder: (context, index) {
        final doc = docs[index];
        return Card(
          child: ListTile(
            title: Text(doc.title, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(
              doc.content.length > 100 ? '${doc.content.substring(0, 100)}...' : doc.content,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: () => ref.read(knowledgeProvider.notifier).removeDocument(doc.id),
            ),
          ),
        );
      },
    );
  }
}

class _MemoryTab extends ConsumerWidget {
  final Uuid uuid;
  const _MemoryTab({required this.uuid});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final memories = ref.watch(memoriesProvider);

    if (memories.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.psychology_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            const Text('No memory notes yet', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 8),
            const Text('Add memories for context-aware conversations', style: TextStyle(color: Colors.grey, fontSize: 12)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: memories.length,
      itemBuilder: (context, index) {
        final mem = memories[index];
        return Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
              child: Text(mem.category[0].toUpperCase()),
            ),
            title: Text(mem.key, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(mem.value, maxLines: 2, overflow: TextOverflow.ellipsis),
            trailing: IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: () => ref.read(memoriesProvider.notifier).removeMemory(mem.id),
            ),
          ),
        );
      },
    );
  }
}
