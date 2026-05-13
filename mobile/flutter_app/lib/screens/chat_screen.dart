import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:uuid/uuid.dart';
import '../providers/app_providers.dart';
import '../models/app_models.dart';
import '../services/chat_service.dart';
import '../widgets/provider_selector.dart';
import '../widgets/sentiment_badge.dart';
import '../widgets/language_badge.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _chatService = ChatService();
  final _uuid = const Uuid();
  bool _isSending = false;

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isSending) return;

    final activeProvider = ref.read(activeProviderProvider);
    final activeModel = ref.read(activeModelProvider);
    final providers = ref.read(providersListProvider);
    final provider = providers.firstWhere((p) => p.id == activeProvider);
    final apiKey = provider.apiKey ?? '';

    if (apiKey.isEmpty && activeProvider != 'ollama') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add an API key in Settings first')),
      );
      return;
    }

    // Create conversation if needed
    var conv = ref.read(activeConversationProvider);
    if (conv == null) {
      conv = Conversation(
        id: _uuid.v4(),
        title: text.length > 40 ? '${text.substring(0, 40)}...' : text,
        provider: activeProvider,
        model: activeModel,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      ref.read(conversationsProvider.notifier).addConversation(conv);
      ref.read(activeConversationProvider.notifier).state = conv;
    }

    // Add user message
    final userMsg = ChatMessage(
      id: _uuid.v4(),
      conversationId: conv.id,
      role: 'user',
      content: text,
      createdAt: DateTime.now(),
    );
    ref.read(messagesProvider.notifier).addMessage(conv.id, userMsg);
    _controller.clear();

    setState(() => _isSending = true);
    ref.read(isStreamingProvider.notifier).state = true;
    ref.read(streamingContentProvider.notifier).state = '';

    // Get conversation history
    final history = ref.read(messagesProvider.notifier).getMessages(conv.id);

    try {
      final stream = _chatService.streamChat(
        provider: activeProvider,
        model: activeModel,
        apiKey: apiKey,
        messages: history,
        baseUrl: provider.baseUrl,
      );

      String fullContent = '';
      await for (final chunk in stream) {
        if (chunk.startsWith('[ERROR]')) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(chunk)),
          );
          break;
        }
        fullContent += chunk;
        ref.read(streamingContentProvider.notifier).state = fullContent;
      }

      // Add assistant message
      final assistantMsg = ChatMessage(
        id: _uuid.v4(),
        conversationId: conv.id,
        role: 'assistant',
        content: fullContent,
        createdAt: DateTime.now(),
      );
      ref.read(messagesProvider.notifier).addMessage(conv.id, assistantMsg);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isSending = false);
      ref.read(isStreamingProvider.notifier).state = false;
      ref.read(streamingContentProvider.notifier).state = '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final conv = ref.watch(activeConversationProvider);
    final messages = conv != null
        ? ref.watch(messagesProvider)[conv.id] ?? []
        : <ChatMessage>[];
    final isStreaming = ref.watch(isStreamingProvider);
    final streamingContent = ref.watch(streamingContentProvider);
    final preferences = ref.watch(preferencesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Hub'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            onPressed: () {
              ref.read(activeConversationProvider.notifier).state = null;
            },
            tooltip: 'New chat',
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: const ProviderSelector(),
        ),
      ),
      body: Column(
        children: [
          // Messages list
          Expanded(
            child: messages.isEmpty && !isStreaming
                ? _buildEmptyState()
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: messages.length + (isStreaming ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == messages.length && isStreaming) {
                        return _MessageBubble(
                          message: ChatMessage(
                            id: 'streaming',
                            conversationId: '',
                            role: 'assistant',
                            content: streamingContent,
                            createdAt: DateTime.now(),
                          ),
                          isStreaming: true,
                          showSentiment: preferences.sentimentEnabled,
                          showLanguage: preferences.languageDetectionEnabled,
                        );
                      }
                      return _MessageBubble(
                        message: messages[index],
                        showSentiment: preferences.sentimentEnabled,
                        showLanguage: preferences.languageDetectionEnabled,
                      );
                    },
                  ),
          ),

          // Quick prompts
          if (messages.isEmpty) _buildQuickPrompts(),

          // Input area
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.smart_toy_outlined, size: 72, color: Theme.of(context).colorScheme.primary.withOpacity(0.5)),
          const SizedBox(height: 16),
          Text('AI Hub', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Choose a provider and start chatting', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildQuickPrompts() {
    final prompts = [
      'Explain quantum computing',
      'Write a Python script',
      'Summarize this topic',
      'Help me debug code',
    ];
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: prompts.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          return ActionChip(
            label: Text(prompts[index]),
            onPressed: () {
              _controller.text = prompts[index];
              _sendMessage();
            },
          );
        },
      ),
    );
  }

  Widget _buildInputArea() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.attach_file_outlined),
              onPressed: () {/* TODO: file/image picker */},
            ),
            Expanded(
              child: TextField(
                controller: _controller,
                decoration: const InputDecoration(
                  hintText: 'Type a message...',
                  border: InputBorder.none,
                ),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
                maxLines: null,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.mic_outlined),
              onPressed: () {/* TODO: voice input */},
            ),
            IconButton(
              icon: _isSending
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.send),
              onPressed: _isSending ? null : _sendMessage,
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isStreaming;
  final bool showSentiment;
  final bool showLanguage;

  const _MessageBubble({
    required this.message,
    this.isStreaming = false,
    this.showSentiment = true,
    this.showLanguage = true,
  });

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isUser
              ? Theme.of(context).colorScheme.primary.withOpacity(0.1)
              : Theme.of(context).cardColor,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 4, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isUser)
              Text(message.content, style: Theme.of(context).textTheme.bodyMedium)
            else
              MarkdownBody(
                data: message.content,
                selectable: true,
              ),
            if (isStreaming)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: Theme.of(context).colorScheme.primary)),
                    const SizedBox(width: 4),
                    Text('Streaming...', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
                  ],
                ),
              ),
            if (!isStreaming && !isUser) ...[
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (showSentiment && message.sentimentScore != null)
                    SentimentBadge(score: message.sentimentScore!),
                  if (showLanguage && message.language != null) ...[
                    const SizedBox(width: 4),
                    LanguageBadge(language: message.language!),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
