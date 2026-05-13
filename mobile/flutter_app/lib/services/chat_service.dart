import 'dart:convert';
import 'dart:async';
import 'package:dio/dio.dart';
import '../models/app_models.dart';

/// Chat service — handles direct API calls for streaming (fallback if Rust bridge unavailable)
class ChatService {
  final Dio _dio = Dio();

  /// Send a streaming chat request
  Stream<String> streamChat({
    required String provider,
    required String model,
    required String apiKey,
    required List<ChatMessage> messages,
    String? baseUrl,
    double temperature = 0.7,
    int maxTokens = 4096,
  }) async* {
    final (url, headers, body) = _buildRequest(
      provider: provider,
      model: model,
      apiKey: apiKey,
      messages: messages,
      baseUrl: baseUrl,
      temperature: temperature,
      maxTokens: maxTokens,
    );

    try {
      final response = await _dio.post<ResponseBody>(
        url,
        data: jsonEncode(body),
        options: Options(
          headers: headers,
          responseType: ResponseType.stream,
        ),
      );

      final stream = response.data?.stream;
      if (stream == null) return;

      String buffer = '';
      await for (final chunk in stream) {
        buffer += utf8.decode(chunk, allowMalformed: true);
        final lines = buffer.split('\n');
        buffer = lines.last;

        for (int i = 0; i < lines.length - 1; i++) {
          final line = lines[i].trim();
          if (line.startsWith('data: ')) {
            final data = line.substring(6);
            if (data == '[DONE]') return;
            try {
              final json = jsonDecode(data);
              final delta = json['choices']?[0]?['delta']?['content'] as String? ?? '';
              if (delta.isNotEmpty) yield delta;
            } catch (_) {}
          }
        }
      }
    } on DioException catch (e) {
      yield '[ERROR] ${e.message ?? "Network error"}';
    }
  }

  /// Send a non-streaming chat request
  Future<ChatResponse> sendChat({
    required String provider,
    required String model,
    required String apiKey,
    required List<ChatMessage> messages,
    String? baseUrl,
    double temperature = 0.7,
    int maxTokens = 4096,
  }) async {
    final (url, headers, body) = _buildRequest(
      provider: provider,
      model: model,
      apiKey: apiKey,
      messages: messages,
      baseUrl: baseUrl,
      temperature: temperature,
      maxTokens: maxTokens,
    );

    final response = await _dio.post(url, data: jsonEncode(body), options: Options(headers: headers));
    final data = response.data;

    return ChatResponse(
      content: _extractContent(data, provider),
      model: data['model'] ?? model,
      provider: provider,
      usage: _extractUsage(data, provider),
    );
  }

  /// Validate an API key
  Future<bool> validateKey(String provider, String apiKey, {String? baseUrl}) async {
    try {
      final (url, headers, _) = _buildValidationRequest(provider, apiKey, baseUrl);
      final response = await _dio.get(url, options: Options(headers: headers));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  (String, Map<String, String>, Map<String, dynamic>) _buildRequest({
    required String provider,
    required String model,
    required String apiKey,
    required List<ChatMessage> messages,
    String? baseUrl,
    double temperature = 0.7,
    int maxTokens = 4096,
  }) {
    final msgList = messages.map((m) => {
      if (m.imageUrl != null)
        {
          'role': m.role,
          'content': [
            {'type': 'text', 'text': m.content},
            {'type': 'image_url', 'image_url': {'url': m.imageUrl}},
          ],
        }
      else
        {'role': m.role, 'content': m.content},
    }).toList();

    final body = <String, dynamic>{
      'model': model,
      'messages': msgList,
      'stream': true,
      'temperature': temperature,
      'max_tokens': maxTokens,
    };

    switch (provider) {
      case 'openrouter':
        return (
          'https://openrouter.ai/api/v1/chat/completions',
          {'Authorization': 'Bearer $apiKey', 'HTTP-Referer': 'https://aihub.app'},
          body,
        );
      case 'nvidia':
        return (
          'https://integrate.api.nvidia.com/v1/chat/completions',
          {'Authorization': 'Bearer $apiKey'},
          body,
        );
      case 'openai':
        return (
          'https://api.openai.com/v1/chat/completions',
          {'Authorization': 'Bearer $apiKey'},
          body,
        );
      case 'groq':
        return (
          'https://api.groq.com/openai/v1/chat/completions',
          {'Authorization': 'Bearer $apiKey'},
          body,
        );
      case 'together':
        return (
          'https://api.together.xyz/v1/chat/completions',
          {'Authorization': 'Bearer $apiKey'},
          body,
        );
      case 'ollama':
        return (
          '${baseUrl ?? "http://localhost:11434"}/api/chat',
          {},
          {'model': model, 'messages': msgList, 'stream': true},
        );
      case 'custom':
        return (
          '${baseUrl ?? "http://localhost:8080/v1"}/chat/completions',
          {'Authorization': 'Bearer $apiKey'},
          body,
        );
      default:
        return (
          'https://openrouter.ai/api/v1/chat/completions',
          {'Authorization': 'Bearer $apiKey'},
          body,
        );
    }
  }

  (String, Map<String, String>, Map<String, dynamic>) _buildValidationRequest(String provider, String apiKey, String? baseUrl) {
    switch (provider) {
      case 'openrouter':
        return ('https://openrouter.ai/api/v1/models', {'Authorization': 'Bearer $apiKey'}, {});
      case 'openai':
        return ('https://api.openai.com/v1/models', {'Authorization': 'Bearer $apiKey'}, {});
      case 'groq':
        return ('https://api.groq.com/openai/v1/models', {'Authorization': 'Bearer $apiKey'}, {});
      default:
        return ('${baseUrl ?? "http://localhost:8080/v1"}/models', {'Authorization': 'Bearer $apiKey'}, {});
    }
  }

  String _extractContent(Map<String, dynamic> data, String provider) {
    if (provider == 'anthropic') {
      return data['content']?[0]?['text'] ?? '';
    }
    return data['choices']?[0]?['message']?['content'] ?? '';
  }

  Map<String, int>? _extractUsage(Map<String, dynamic> data, String provider) {
    final usage = data['usage'];
    if (usage == null) return null;
    return {
      'prompt_tokens': usage['prompt_tokens'] ?? 0,
      'completion_tokens': usage['completion_tokens'] ?? 0,
      'total_tokens': usage['total_tokens'] ?? 0,
    };
  }
}

class ChatResponse {
  final String content;
  final String model;
  final String provider;
  final Map<String, int>? usage;
  ChatResponse({required this.content, required this.model, required this.provider, this.usage});
}
