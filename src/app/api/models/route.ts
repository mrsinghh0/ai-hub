import { PROVIDERS } from '@/lib/providers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('provider');
    const baseUrl = searchParams.get('baseUrl');

    if (!providerId) {
      return NextResponse.json({ error: 'Provider parameter is required' }, { status: 400 });
    }

    // For Ollama, fetch available models from the local server
    if (providerId === 'ollama') {
      const effectiveUrl = (baseUrl || 'http://localhost:11434').replace(/\/v1$/, '');
      try {
        const response = await fetch(`${effectiveUrl}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          return NextResponse.json({ error: 'Failed to fetch Ollama models', models: [] }, { status: 200 });
        }

        const data = await response.json();
        const models = (data.models || []).map((m: { name: string; size?: number; modified_at?: string }) => ({
          id: m.name,
          name: m.name,
          size: m.size,
          modified_at: m.modified_at,
        }));

        return NextResponse.json({ models, provider: providerId });
      } catch {
        return NextResponse.json({ error: 'Cannot connect to Ollama', models: [] }, { status: 200 });
      }
    }

    // For custom/OpenAI-compatible providers, try to fetch models list
    const provider = PROVIDERS.find(p => p.id === providerId);
    const effectiveBaseUrl = baseUrl || provider?.baseUrl || '';

    if (!effectiveBaseUrl) {
      return NextResponse.json({ error: 'Base URL is required', models: [] }, { status: 200 });
    }

    try {
      const apiKey = searchParams.get('apiKey');
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      if (providerId === 'openrouter') {
        headers['HTTP-Referer'] = 'https://ai-hub.app';
        headers['X-Title'] = 'AI Hub';
      }

      const response = await fetch(`${effectiveBaseUrl}/models`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return NextResponse.json({
          error: `Failed to fetch models (HTTP ${response.status})`,
          models: provider?.models || [],
        }, { status: 200 });
      }

      const data = await response.json();
      const models = (data.data || []).map((m: { id: string; owned_by?: string }) => ({
        id: m.id,
        name: m.id,
        owned_by: m.owned_by,
      }));

      return NextResponse.json({ models, provider: providerId });
    } catch {
      return NextResponse.json({
        error: 'Cannot connect to provider',
        models: provider?.models || [],
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Models fetch error:', error);
    return NextResponse.json({ error: 'Internal server error', models: [] }, { status: 500 });
  }
}
