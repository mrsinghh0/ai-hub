import 'package:freezed_annotation/freezed_annotation.dart';

part 'app_models.freezed.dart';
part 'app_models.g.dart';

// ---- Chat ----

@freezed
class ChatMessage with _$ChatMessage {
  const factory ChatMessage({
    required String id,
    required String conversationId,
    required String role,
    required String content,
    String? imageUrl,
    double? sentimentScore,
    String? language,
    @Default(0) int tokensUsed,
    @Default(0.0) double cost,
    required DateTime createdAt,
  }) = _ChatMessage;
  factory ChatMessage.fromJson(Map<String, dynamic> json) => _$ChatMessageFromJson(json);
}

@freezed
class Conversation with _$Conversation {
  const factory Conversation({
    required String id,
    required String title,
    required String provider,
    required String model,
    required DateTime createdAt,
    required DateTime updatedAt,
    @Default(0) int messageCount,
  }) = _Conversation;
  factory Conversation.fromJson(Map<String, dynamic> json) => _$ConversationFromJson(json);
}

// ---- Providers ----

@freezed
class ProviderInfo with _$ProviderInfo {
  const factory ProviderInfo({
    required String id,
    required String name,
    required String baseUrl,
    String? apiKeyPrefix,
    @Default(true) bool supportsStreaming,
    @Default(false) bool supportsVision,
    @Default(false) bool isConnected,
    String? apiKey,
  }) = _ProviderInfo;
  factory ProviderInfo.fromJson(Map<String, dynamic> json) => _$ProviderInfoFromJson(json);
}

@freezed
class ModelInfo with _$ModelInfo {
  const factory ModelInfo({
    required String id,
    required String name,
    required String provider,
    String? description,
    int? contextLength,
    PricingInfo? pricing,
    required ModelCapabilities capabilities,
  }) = _ModelInfo;
  factory ModelInfo.fromJson(Map<String, dynamic> json) => _$ModelInfoFromJson(json);
}

@freezed
class PricingInfo with _$PricingInfo {
  const factory PricingInfo({
    required double promptPerMillion,
    required double completionPerMillion,
  }) = _PricingInfo;
  factory PricingInfo.fromJson(Map<String, dynamic> json) => _$PricingInfoFromJson(json);
}

@freezed
class ModelCapabilities with _$ModelCapabilities {
  const factory ModelCapabilities({
    @Default(true) bool chat,
    @Default(false) bool vision,
    @Default(true) bool streaming,
    @Default(false) bool functionCalling,
  }) = _ModelCapabilities;
  factory ModelCapabilities.fromJson(Map<String, dynamic> json) => _$ModelCapabilitiesFromJson(json);
}

// ---- Sentiment ----

enum SentimentLabel { veryNegative, negative, neutral, positive, veryPositive }

@freezed
class SentimentResult with _$SentimentResult {
  const factory SentimentResult({
    required double score,
    required double magnitude,
    required SentimentLabel label,
    required List<String> positiveWords,
    required List<String> negativeWords,
  }) = _SentimentResult;
  factory SentimentResult.fromJson(Map<String, dynamic> json) => _$SentimentResultFromJson(json);
}

// ---- Language ----

@freezed
class LanguageResult with _$LanguageResult {
  const factory LanguageResult({
    required String language,
    required String code,
    required double confidence,
    required String script,
  }) = _LanguageResult;
  factory LanguageResult.fromJson(Map<String, dynamic> json) => _$LanguageResultFromJson(json);
}

// ---- Memory ----

@freezed
class MemoryNote with _$MemoryNote {
  const factory MemoryNote({
    required String id,
    required String key,
    required String value,
    @Default('general') String category,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _MemoryNote;
  factory MemoryNote.fromJson(Map<String, dynamic> json) => _$MemoryNoteFromJson(json);
}

// ---- Knowledge ----

@freezed
class KnowledgeDocument with _$KnowledgeDocument {
  const factory KnowledgeDocument({
    required String id,
    required String title,
    required String content,
    String? source,
    String? tags,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _KnowledgeDocument;
  factory KnowledgeDocument.fromJson(Map<String, dynamic> json) => _$KnowledgeDocumentFromJson(json);
}

// ---- Usage Stats ----

@freezed
class UsageStat with _$UsageStat {
  const factory UsageStat({
    required String provider,
    required String model,
    required int promptTokens,
    required int completionTokens,
    required int totalTokens,
    required double cost,
    required int latencyMs,
    required DateTime createdAt,
  }) = _UsageStat;
  factory UsageStat.fromJson(Map<String, dynamic> json) => _$UsageStatFromJson(json);
}

// ---- Preferences ----

@freezed
class UserPreferences with _$UserPreferences {
  const factory UserPreferences({
    @Default(10.0) double budgetLimit,
    @Default(30) int memoryRetentionDays,
    @Default(true) bool sentimentEnabled,
    @Default(true) bool languageDetectionEnabled,
    @Default(true) bool ragEnabled,
    @Default(true) bool memoryEnabled,
    @Default(true) bool privacyMode,
    @Default('en') String defaultLanguage,
  }) = _UserPreferences;
  factory UserPreferences.fromJson(Map<String, dynamic> json) => _$UserPreferencesFromJson(json);
}
