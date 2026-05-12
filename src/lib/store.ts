import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs?: number;
}

export interface KeyTestResult {
  provider: string;
  valid: boolean;
  testing: boolean;
  latencyMs?: number;
  error?: string;
  message?: string;
  modelCount?: number;
  sampleModels?: string[];
  models?: string[];
  testedAt?: number;
}

export interface QuickPrompt {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  category: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  { id: 'general', name: 'General Chat', icon: '💬', prompt: 'You are a helpful, friendly AI assistant. Answer questions clearly and concisely.', category: 'General' },
  { id: 'coder', name: 'Code Expert', icon: '💻', prompt: 'You are an expert software engineer. Write clean, efficient, well-documented code. Always explain your approach and include error handling. Use best practices and modern patterns.', category: 'Development' },
  { id: 'debug', name: 'Debug Assistant', icon: '🐛', prompt: 'You are a debugging expert. Help identify and fix code issues. Analyze error messages, trace execution flow, and suggest fixes with explanations.', category: 'Development' },
  { id: 'review', name: 'Code Reviewer', icon: '🔍', prompt: 'You are a senior code reviewer. Analyze code for bugs, security issues, performance problems, and style violations. Provide constructive feedback with specific suggestions.', category: 'Development' },
  { id: 'writer', name: 'Content Writer', icon: '✍️', prompt: 'You are a skilled content writer. Create engaging, well-structured content with proper grammar and style. Adapt tone to the target audience.', category: 'Writing' },
  { id: 'summarizer', name: 'Summarizer', icon: '📝', prompt: 'You are an expert at summarizing content. Provide concise, accurate summaries that capture key points. Use bullet points for clarity when appropriate.', category: 'Writing' },
  { id: 'translator', name: 'Translator', icon: '🌍', prompt: 'You are a professional translator. Translate text accurately while preserving meaning, tone, and cultural nuances. Support all major languages.', category: 'Language' },
  { id: 'tutor', name: 'Tutor', icon: '🎓', prompt: 'You are a patient, encouraging tutor. Explain concepts step by step, use examples and analogies, check understanding, and adapt to the learner\'s level.', category: 'Education' },
  { id: 'analyst', name: 'Data Analyst', icon: '📊', prompt: 'You are a data analyst expert. Help analyze data, create visualizations, interpret results, and provide actionable insights. Use statistical methods when appropriate.', category: 'Analysis' },
  { id: 'creative', name: 'Creative Writer', icon: '🎨', prompt: 'You are a creative writer with a vivid imagination. Write compelling stories, poems, scripts, and creative content. Use rich descriptions and engaging narratives.', category: 'Creative' },
  { id: 'shell', name: 'Shell Expert', icon: '🖥️', prompt: 'You are a shell/command line expert. Provide accurate terminal commands for Linux, macOS, and Windows. Explain each command and flag. Consider safety and best practices.', category: 'Development' },
  { id: 'architect', name: 'System Architect', icon: '🏗️', prompt: 'You are a system architect. Help design scalable, maintainable software architectures. Consider performance, security, reliability, and cost. Provide diagrams and trade-off analysis.', category: 'Development' },
];

interface AppState {
  activeTab: 'chat' | 'models' | 'history' | 'analytics' | 'settings';
  setActiveTab: (tab: AppState['activeTab']) => void;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  removeMessage: (id: string) => void;
  updateMessageContent: (id: string, content: string) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  maxTokens: number;
  setMaxTokens: (tokens: number) => void;
  topP: number;
  setTopP: (p: number) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  // Key testing
  keyTestResults: Record<string, KeyTestResult>;
  setKeyTestResult: (provider: string, result: KeyTestResult) => void;
  clearKeyTestResults: () => void;
  // Discovered models from local/custom providers
  discoveredModels: Record<string, string[]>;
  setDiscoveredModels: (provider: string, models: string[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedProvider: 'openrouter',
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  selectedModel: 'openai/gpt-4o-mini',
  setSelectedModel: (model) => set({ selectedModel: model }),
  currentConversationId: null,
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  chatMessages: [],
  setChatMessages: (messages) => set({ chatMessages: messages }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.chatMessages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
        messages[lastIdx] = { ...messages[lastIdx], content };
      }
      return { chatMessages: messages };
    }),
  removeMessage: (id) =>
    set((state) => ({ chatMessages: state.chatMessages.filter(m => m.id !== id) })),
  updateMessageContent: (id, content) =>
    set((state) => ({
      chatMessages: state.chatMessages.map(m => m.id === id ? { ...m, content } : m),
    })),
  isStreaming: false,
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  temperature: 0.7,
  setTemperature: (temp) => set({ temperature: temp }),
  maxTokens: 4096,
  setMaxTokens: (tokens) => set({ maxTokens: tokens }),
  topP: 1,
  setTopP: (p) => set({ topP: p }),
  systemPrompt: '',
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  // Key testing
  keyTestResults: {},
  setKeyTestResult: (provider, result) =>
    set((state) => ({
      keyTestResults: { ...state.keyTestResults, [provider]: result },
    })),
  clearKeyTestResults: () => set({ keyTestResults: {} }),
  // Discovered models
  discoveredModels: {},
  setDiscoveredModels: (provider, models) =>
    set((state) => ({
      discoveredModels: { ...state.discoveredModels, [provider]: models },
    })),
}));
