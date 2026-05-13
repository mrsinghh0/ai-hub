export interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  baseUrl: string;
  supportsStreaming: boolean;
  models: ModelConfig[];
  defaultModel: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  maxTokens: number;
  inputPricePer1k: number;
  outputPricePer1k: number;
  contextWindow: number;
  capabilities: string[];
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🌐',
    color: 'bg-purple-500',
    baseUrl: 'https://openrouter.ai/api/v1',
    supportsStreaming: true,
    defaultModel: 'openai/gpt-4o-mini',
    models: [
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 16384, inputPricePer1k: 0.00015, outputPricePer1k: 0.0006, contextWindow: 128000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'openai/gpt-4o', name: 'GPT-4o', maxTokens: 16384, inputPricePer1k: 0.005, outputPricePer1k: 0.015, contextWindow: 128000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', maxTokens: 8192, inputPricePer1k: 0.003, outputPricePer1k: 0.015, contextWindow: 200000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', maxTokens: 8192, inputPricePer1k: 0.00125, outputPricePer1k: 0.005, contextWindow: 1000000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', maxTokens: 8192, inputPricePer1k: 0.0006, outputPricePer1k: 0.0008, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'mistralai/mistral-large', name: 'Mistral Large', maxTokens: 8192, inputPricePer1k: 0.002, outputPricePer1k: 0.006, contextWindow: 128000, capabilities: ['chat', 'code'] },
    ]
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    icon: '🟢',
    color: 'bg-green-600',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    supportsStreaming: true,
    defaultModel: 'meta/llama-3.1-405b-instruct',
    models: [
      { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', maxTokens: 4096, inputPricePer1k: 0.003, outputPricePer1k: 0.003, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', maxTokens: 4096, inputPricePer1k: 0.0006, outputPricePer1k: 0.0006, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', maxTokens: 4096, inputPricePer1k: 0.0006, outputPricePer1k: 0.0006, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B', maxTokens: 4096, inputPricePer1k: 0.0002, outputPricePer1k: 0.0002, contextWindow: 8192, capabilities: ['chat', 'code'] },
      { id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'Mixtral 8x22B', maxTokens: 4096, inputPricePer1k: 0.0008, outputPricePer1k: 0.0008, contextWindow: 64000, capabilities: ['chat', 'code'] },
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '⚡',
    color: 'bg-emerald-500',
    baseUrl: 'https://api.openai.com/v1',
    supportsStreaming: true,
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 16384, inputPricePer1k: 0.00015, outputPricePer1k: 0.0006, contextWindow: 128000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 16384, inputPricePer1k: 0.005, outputPricePer1k: 0.015, contextWindow: 128000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 4096, inputPricePer1k: 0.01, outputPricePer1k: 0.03, contextWindow: 128000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'o1-mini', name: 'o1-mini', maxTokens: 65536, inputPricePer1k: 0.003, outputPricePer1k: 0.012, contextWindow: 128000, capabilities: ['chat', 'code'] },
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    color: 'bg-orange-500',
    baseUrl: 'https://api.anthropic.com/v1',
    supportsStreaming: true,
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', maxTokens: 8192, inputPricePer1k: 0.003, outputPricePer1k: 0.015, contextWindow: 200000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', maxTokens: 8192, inputPricePer1k: 0.001, outputPricePer1k: 0.005, contextWindow: 200000, capabilities: ['chat', 'code'] },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', maxTokens: 4096, inputPricePer1k: 0.015, outputPricePer1k: 0.075, contextWindow: 200000, capabilities: ['chat', 'code', 'vision'] },
    ]
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: '✨',
    color: 'bg-sky-500',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    supportsStreaming: true,
    defaultModel: 'gemini-1.5-pro',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', maxTokens: 8192, inputPricePer1k: 0.00125, outputPricePer1k: 0.005, contextWindow: 2000000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', maxTokens: 8192, inputPricePer1k: 0.000075, outputPricePer1k: 0.0003, contextWindow: 1000000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', maxTokens: 8192, inputPricePer1k: 0.0001, outputPricePer1k: 0.0004, contextWindow: 1048576, capabilities: ['chat', 'code', 'vision'] },
    ]
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    color: 'bg-amber-500',
    baseUrl: 'https://api.groq.com/openai/v1',
    supportsStreaming: true,
    defaultModel: 'llama-3.1-70b-versatile',
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', maxTokens: 8192, inputPricePer1k: 0.00059, outputPricePer1k: 0.00079, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', maxTokens: 8192, inputPricePer1k: 0.00005, outputPricePer1k: 0.00008, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', maxTokens: 32768, inputPricePer1k: 0.00024, outputPricePer1k: 0.00024, contextWindow: 32768, capabilities: ['chat', 'code'] },
    ]
  },
  {
    id: 'together',
    name: 'Together AI',
    icon: '🤝',
    color: 'bg-teal-500',
    baseUrl: 'https://api.together.xyz/v1',
    supportsStreaming: true,
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo', maxTokens: 8192, inputPricePer1k: 0.00088, outputPricePer1k: 0.00088, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Turbo', maxTokens: 4096, inputPricePer1k: 0.005, outputPricePer1k: 0.005, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', maxTokens: 8192, inputPricePer1k: 0.00088, outputPricePer1k: 0.00088, contextWindow: 32768, capabilities: ['chat', 'code'] },
    ]
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    icon: '🦙',
    color: 'bg-gray-600',
    baseUrl: 'http://localhost:11434/v1',
    supportsStreaming: true,
    defaultModel: 'llama3.1',
    models: [
      { id: 'llama3.1', name: 'Llama 3.1', maxTokens: 4096, inputPricePer1k: 0, outputPricePer1k: 0, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'llama3.1:70b', name: 'Llama 3.1 70B', maxTokens: 4096, inputPricePer1k: 0, outputPricePer1k: 0, contextWindow: 128000, capabilities: ['chat', 'code'] },
      { id: 'mistral', name: 'Mistral 7B', maxTokens: 4096, inputPricePer1k: 0, outputPricePer1k: 0, contextWindow: 32000, capabilities: ['chat', 'code'] },
      { id: 'codellama', name: 'Code Llama', maxTokens: 4096, inputPricePer1k: 0, outputPricePer1k: 0, contextWindow: 16384, capabilities: ['chat', 'code'] },
      { id: 'qwen2.5', name: 'Qwen 2.5', maxTokens: 4096, inputPricePer1k: 0, outputPricePer1k: 0, contextWindow: 32768, capabilities: ['chat', 'code'] },
    ]
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    icon: '🔧',
    color: 'bg-slate-500',
    baseUrl: '',
    supportsStreaming: true,
    defaultModel: '',
    models: []
  }
];

export function getProvider(id: string): ProviderConfig | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function getModelPrice(providerId: string, modelId: string): { input: number; output: number } {
  const provider = getProvider(providerId);
  const model = provider?.models.find(m => m.id === modelId);
  return { input: model?.inputPricePer1k ?? 0, output: model?.outputPricePer1k ?? 0 };
}
