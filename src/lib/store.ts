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
}));
