import 'package:flutter/material.dart';

/// Chat message model
class ChatMessage {
  final String id;
  final String conversationId;
  final String role;
  final String content;
  final String? imageUrl;
  final double? sentimentScore;
  final String? language;
  final int tokensUsed;
  final double cost;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.role,
    required this.content,
    this.imageUrl,
    this.sentimentScore,
    this.language,
    this.tokensUsed = 0,
    this.cost = 0.0,
    required this.createdAt,
  });
}

/// Conversation model
class Conversation {
  final String id;
  final String title;
  final String provider;
  final String model;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int messageCount;

  Conversation({
    required this.id,
    required this.title,
    required this.provider,
    required this.model,
    required this.createdAt,
    required this.updatedAt,
    this.messageCount = 0,
  });

  Conversation copyWith({
    String? title,
    DateTime? updatedAt,
    int? messageCount,
  }) {
    return Conversation(
      id: id,
      title: title ?? this.title,
      provider: provider,
      model: model,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      messageCount: messageCount ?? this.messageCount,
    );
  }
}

/// Provider info model
class ProviderInfo {
  final String id;
  final String name;
  final String baseUrl;
  final String? apiKeyPrefix;
  final bool supportsStreaming;
  final bool supportsVision;
  final bool isConnected;
  final String? apiKey;

  ProviderInfo({
    required this.id,
    required this.name,
    required this.baseUrl,
    this.apiKeyPrefix,
    this.supportsStreaming = true,
    this.supportsVision = false,
    this.isConnected = false,
    this.apiKey,
  });

  ProviderInfo copyWith({
    String? apiKey,
    bool? isConnected,
  }) {
    return ProviderInfo(
      id: id,
      name: name,
      baseUrl: baseUrl,
      apiKeyPrefix: apiKeyPrefix,
      supportsStreaming: supportsStreaming,
      supportsVision: supportsVision,
      isConnected: isConnected ?? this.isConnected,
      apiKey: apiKey ?? this.apiKey,
    );
  }
}

/// Model info
class ModelInfo {
  final String id;
  final String name;
  final String provider;

  ModelInfo({required this.id, required this.name, required this.provider});
}

/// Sentiment label enum
enum SentimentLabel { veryNegative, negative, neutral, positive, veryPositive }

/// Sentiment result
class SentimentResult {
  final double score;
  final double magnitude;
  final SentimentLabel label;
  final List<String> positiveWords;
  final List<String> negativeWords;

  SentimentResult({
    required this.score,
    required this.magnitude,
    required this.label,
    required this.positiveWords,
    required this.negativeWords,
  });
}

/// Language result
class LanguageResult {
  final String language;
  final String code;
  final double confidence;
  final String script;

  LanguageResult({
    required this.language,
    required this.code,
    required this.confidence,
    required this.script,
  });
}

/// Memory note
class MemoryNote {
  final String id;
  final String key;
  final String value;
  final String category;
  final DateTime createdAt;
  final DateTime updatedAt;

  MemoryNote({
    required this.id,
    required this.key,
    required this.value,
    this.category = 'general',
    required this.createdAt,
    required this.updatedAt,
  });
}

/// Knowledge document
class KnowledgeDocument {
  final String id;
  final String title;
  final String content;
  final String? source;
  final String? tags;
  final DateTime createdAt;
  final DateTime updatedAt;

  KnowledgeDocument({
    required this.id,
    required this.title,
    required this.content,
    this.source,
    this.tags,
    required this.createdAt,
    required this.updatedAt,
  });
}

/// Usage stat
class UsageStat {
  final String provider;
  final String model;
  final int promptTokens;
  final int completionTokens;
  final int totalTokens;
  final double cost;
  final int latencyMs;
  final DateTime createdAt;

  UsageStat({
    required this.provider,
    required this.model,
    required this.promptTokens,
    required this.completionTokens,
    required this.totalTokens,
    required this.cost,
    required this.latencyMs,
    required this.createdAt,
  });
}

/// User preferences
class UserPreferences {
  final double budgetLimit;
  final int memoryRetentionDays;
  final bool sentimentEnabled;
  final bool languageDetectionEnabled;
  final bool ragEnabled;
  final bool memoryEnabled;
  final bool privacyMode;
  final String defaultLanguage;

  UserPreferences({
    this.budgetLimit = 10.0,
    this.memoryRetentionDays = 30,
    this.sentimentEnabled = true,
    this.languageDetectionEnabled = true,
    this.ragEnabled = true,
    this.memoryEnabled = true,
    this.privacyMode = true,
    this.defaultLanguage = 'en',
  });

  UserPreferences copyWith({
    double? budgetLimit,
    int? memoryRetentionDays,
    bool? sentimentEnabled,
    bool? languageDetectionEnabled,
    bool? ragEnabled,
    bool? memoryEnabled,
    bool? privacyMode,
    String? defaultLanguage,
  }) {
    return UserPreferences(
      budgetLimit: budgetLimit ?? this.budgetLimit,
      memoryRetentionDays: memoryRetentionDays ?? this.memoryRetentionDays,
      sentimentEnabled: sentimentEnabled ?? this.sentimentEnabled,
      languageDetectionEnabled: languageDetectionEnabled ?? this.languageDetectionEnabled,
      ragEnabled: ragEnabled ?? this.ragEnabled,
      memoryEnabled: memoryEnabled ?? this.memoryEnabled,
      privacyMode: privacyMode ?? this.privacyMode,
      defaultLanguage: defaultLanguage ?? this.defaultLanguage,
    );
  }
}
