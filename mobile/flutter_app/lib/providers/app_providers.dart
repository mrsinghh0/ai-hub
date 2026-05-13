import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../models/app_models.dart';
import '../services/bridge_service.dart';

// ---- UUID ----
final _uuid = const Uuid();

// ---- Theme ----
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

// ---- Current tab ----
final currentTabProvider = StateProvider<int>((ref) => 0);

// ---- Providers list ----
final providersListProvider = StateNotifierProvider<ProvidersNotifier, List<ProviderInfo>>((ref) {
  return ProvidersNotifier();
});

class ProvidersNotifier extends StateNotifier<List<ProviderInfo>> {
  ProvidersNotifier() : super(_defaultProviders);

  static final _defaultProviders = [
    ProviderInfo(id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', apiKeyPrefix: 'sk-or-', supportsStreaming: true, supportsVision: true),
    ProviderInfo(id: 'nvidia', name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', apiKeyPrefix: 'nvapi-', supportsStreaming: true, supportsVision: true),
    ProviderInfo(id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKeyPrefix: 'sk-', supportsStreaming: true, supportsVision: true),
    ProviderInfo(id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', apiKeyPrefix: 'sk-ant-', supportsStreaming: true, supportsVision: true),
    ProviderInfo(id: 'google', name: 'Google AI', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKeyPrefix: 'AI', supportsStreaming: true, supportsVision: true),
    ProviderInfo(id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', apiKeyPrefix: 'gsk_', supportsStreaming: true),
    ProviderInfo(id: 'together', name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', supportsStreaming: true),
    ProviderInfo(id: 'ollama', name: 'Ollama (Local)', baseUrl: 'http://localhost:11434', supportsStreaming: true),
    ProviderInfo(id: 'custom', name: 'Custom Provider', baseUrl: 'http://localhost:8080/v1', supportsStreaming: true),
  ];

  void setApiKey(String providerId, String key) {
    state = [
      for (final p in state)
        if (p.id == providerId) p.copyWith(apiKey: key, isConnected: key.isNotEmpty) else p,
    ];
  }

  void setConnected(String providerId, bool connected) {
    state = [
      for (final p in state)
        if (p.id == providerId) p.copyWith(isConnected: connected) else p,
    ];
  }
}

// ---- Active provider & model ----
final activeProviderProvider = StateProvider<String>((ref) => 'openrouter');
final activeModelProvider = StateProvider<String>((ref) => 'openai/gpt-3.5-turbo');

// ---- Conversations ----
final conversationsProvider = StateNotifierProvider<ConversationsNotifier, List<Conversation>>((ref) {
  return ConversationsNotifier();
});

class ConversationsNotifier extends StateNotifier<List<Conversation>> {
  ConversationsNotifier() : super([]);

  void addConversation(Conversation conv) {
    state = [conv, ...state];
  }

  void deleteConversation(String id) {
    state = state.where((c) => c.id != id).toList();
  }

  void renameConversation(String id, String newTitle) {
    state = [
      for (final c in state)
        if (c.id == id) c.copyWith(title: newTitle, updatedAt: DateTime.now()) else c,
    ];
  }
}

// ---- Active conversation ----
final activeConversationProvider = StateProvider<Conversation?>((ref) => null);

// ---- Messages ----
final messagesProvider = StateNotifierProvider<MessagesNotifier, Map<String, List<ChatMessage>>>((ref) {
  return MessagesNotifier();
});

class MessagesNotifier extends StateNotifier<Map<String, List<ChatMessage>>> {
  MessagesNotifier() : super({});

  void addMessage(String conversationId, ChatMessage msg) {
    state = {
      ...state,
      conversationId: [...?state[conversationId], msg],
    };
  }

  void setMessages(String conversationId, List<ChatMessage> msgs) {
    state = {...state, conversationId: msgs};
  }

  List<ChatMessage> getMessages(String conversationId) => state[conversationId] ?? [];
}

// ---- Streaming state ----
final isStreamingProvider = StateProvider<bool>((ref) => false);
final streamingContentProvider = StateProvider<String>((ref) => '');

// ---- Memory ----
final memoriesProvider = StateNotifierProvider<MemoriesNotifier, List<MemoryNote>>((ref) {
  return MemoriesNotifier();
});

class MemoriesNotifier extends StateNotifier<List<MemoryNote>> {
  MemoriesNotifier() : super([]);

  void addMemory(MemoryNote note) => state = [note, ...state];
  void removeMemory(String id) => state = state.where((m) => m.id != id).toList();
}

// ---- Knowledge ----
final knowledgeProvider = StateNotifierProvider<KnowledgeNotifier, List<KnowledgeDocument>>((ref) {
  return KnowledgeNotifier();
});

class KnowledgeNotifier extends StateNotifier<List<KnowledgeDocument>> {
  KnowledgeNotifier() : super([]);

  void addDocument(KnowledgeDocument doc) => state = [doc, ...state];
  void removeDocument(String id) => state = state.where((d) => d.id != id).toList();
}

// ---- Usage Stats ----
final usageStatsProvider = StateNotifierProvider<UsageStatsNotifier, List<UsageStat>>((ref) {
  return UsageStatsNotifier();
});

class UsageStatsNotifier extends StateNotifier<List<UsageStat>> {
  UsageStatsNotifier() : super([]);

  void addStat(UsageStat stat) => state = [stat, ...state];

  double get totalCost => state.fold(0.0, (sum, s) => sum + s.cost);
  int get totalTokens => state.fold(0, (sum, s) => sum + s.totalTokens);
  int get totalRequests => state.length;
}

// ---- User Preferences ----
final preferencesProvider = StateProvider<UserPreferences>((ref) => const UserPreferences());
