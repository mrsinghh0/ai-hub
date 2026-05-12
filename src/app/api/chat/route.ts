import { db } from '@/lib/db';
import { PROVIDERS } from '@/lib/providers';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      provider: providerId,
      model,
      messages,
      apiKey,
      baseUrl,
      temperature = 0.7,
      maxTokens = 4096,
      topP = 1,
      stream = true,
      systemPrompt,
    } = body;

    if (!providerId || !model || !messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Provider, model, and messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const provider = PROVIDERS.find(p => p.id === providerId);
    if (!provider && providerId !== 'custom') {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const effectiveBaseUrl = baseUrl || provider?.baseUrl || '';
    const startTime = Date.now();

    // Build request based on provider type
    let requestUrl: string;
    let requestHeaders: Record<string, string>;
    let requestBody: string;

    if (providerId === 'anthropic') {
      // Anthropic uses different API format
      requestUrl = `${effectiveBaseUrl}/messages`;
      requestHeaders = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
      };

      // Separate system message from messages
      const anthropicMessages = messages
        .filter((m: { role: string }) => m.role !== 'system')
        .map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        }));

      const systemContent = systemPrompt || messages.find((m: { role: string }) => m.role === 'system')?.content;

      requestBody = JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        ...(systemContent ? { system: systemContent } : {}),
        temperature,
        top_p: topP,
        stream,
      });
    } else {
      // OpenAI-compatible format
      requestUrl = `${effectiveBaseUrl}/chat/completions`;

      if (providerId === 'google') {
        requestHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || ''}`,
        };
      } else if (providerId === 'ollama') {
        requestHeaders = {
          'Content-Type': 'application/json',
        };
      } else if (providerId === 'openrouter') {
        requestHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || ''}`,
          'HTTP-Referer': 'https://ai-hub.app',
          'X-Title': 'AI Hub',
        };
      } else {
        requestHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey || ''}`,
        };
      }

      const openaiMessages = [];
      if (systemPrompt) {
        openaiMessages.push({ role: 'system', content: systemPrompt });
      }
      openaiMessages.push(...messages);

      requestBody = JSON.stringify({
        model,
        messages: openaiMessages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        stream,
      });
    }

    // Make the API request
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const latencyMs = Date.now() - startTime;

      // Log failed usage
      await db.usageLog.create({
        data: {
          provider: providerId,
          model,
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
          latencyMs,
          success: false,
          error: errorText.slice(0, 500),
        },
      });

      return new Response(
        JSON.stringify({ error: `API error: ${response.status} - ${errorText.slice(0, 200)}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!stream) {
      // Non-streaming response
      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      let content: string;
      let tokensIn = 0;
      let tokensOut = 0;

      if (providerId === 'anthropic') {
        content = data.content?.[0]?.text || '';
        tokensIn = data.usage?.input_tokens || 0;
        tokensOut = data.usage?.output_tokens || 0;
      } else {
        content = data.choices?.[0]?.message?.content || '';
        tokensIn = data.usage?.prompt_tokens || 0;
        tokensOut = data.usage?.completion_tokens || 0;
      }

      const providerConfig = PROVIDERS.find(p => p.id === providerId);
      const modelConfig = providerConfig?.models.find(m => m.id === model);
      const costUsd = (tokensIn / 1000) * (modelConfig?.inputPricePer1k || 0) +
        (tokensOut / 1000) * (modelConfig?.outputPricePer1k || 0);

      // Log usage
      await db.usageLog.create({
        data: {
          provider: providerId,
          model,
          tokensIn,
          tokensOut,
          costUsd,
          latencyMs,
          success: true,
        },
      });

      return new Response(JSON.stringify({ content, tokensIn, tokensOut, costUsd, latencyMs }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Streaming response - transform and pass through
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = '';
    let totalTokensIn = 0;
    let totalTokensOut = 0;

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              const latencyMs = Date.now() - startTime;
              const providerConfig = PROVIDERS.find(p => p.id === providerId);
              const modelConfig = providerConfig?.models.find(m => m.id === model);
              const costUsd = (totalTokensIn / 1000) * (modelConfig?.inputPricePer1k || 0) +
                (totalTokensOut / 1000) * (modelConfig?.outputPricePer1k || 0);

              // Log usage in background
              db.usageLog.create({
                data: {
                  provider: providerId,
                  model,
                  tokensIn: totalTokensIn,
                  tokensOut: totalTokensOut,
                  costUsd,
                  latencyMs,
                  success: true,
                },
              }).catch(console.error);

              // Send final metadata
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'done',
                tokensIn: totalTokensIn,
                tokensOut: totalTokensOut,
                costUsd,
                latencyMs,
              })}\n\n`));
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (providerId === 'anthropic') {
                // Anthropic streaming format
                if (parsed.type === 'content_block_delta') {
                  const delta = parsed.delta?.text || '';
                  fullContent += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'delta',
                    content: delta,
                  })}\n\n`));
                } else if (parsed.type === 'message_start') {
                  totalTokensIn = parsed.message?.usage?.input_tokens || 0;
                } else if (parsed.type === 'message_delta') {
                  totalTokensOut = parsed.usage?.output_tokens || 0;
                }
              } else {
                // OpenAI-compatible streaming format
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'delta',
                    content: delta,
                  })}\n\n`));
                }
                // Extract usage if available
                if (parsed.usage) {
                  totalTokensIn = parsed.usage.prompt_tokens || totalTokensIn;
                  totalTokensOut = parsed.usage.completion_tokens || totalTokensOut;
                }
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      },
    });

    const stream = response.body!.pipeThrough(transformStream);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
