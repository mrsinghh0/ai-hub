'use client';

import { useAppStore, ChatMessage } from '@/lib/store';
import { PROVIDERS, getProvider } from '@/lib/providers';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Send, SlidersHorizontal, ChevronDown, Loader2, Bot, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words
      prose-p:my-1 prose-pre:my-1 prose-ul:my-1 prose-ol:my-1
      prose-headings:my-2 prose-h1:text-lg prose-h2:text-base prose-h3:text-sm">
      <ReactMarkdown
        components={{
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{children}</pre>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>
            ) : (
              <code className={className}>{children}</code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ChatView() {
  const {
    selectedProvider,
    setSelectedProvider,
    selectedModel,
    setSelectedModel,
    chatMessages,
    setChatMessages,
    addChatMessage,
    updateLastAssistantMessage,
    isStreaming,
    setIsStreaming,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    topP,
    setTopP,
    systemPrompt,
    setSystemPrompt,
    currentConversationId,
    setCurrentConversationId,
    setActiveTab,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load API keys
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const keys = await res.json();
      const keyMap: Record<string, string> = {};
      const urlMap: Record<string, string> = {};
      for (const key of keys) {
        if (!keyMap[key.provider]) {
          keyMap[key.provider] = key.key;
        }
        if (key.baseUrl && !urlMap[key.provider]) {
          urlMap[key.provider] = key.baseUrl;
        }
      }
      setApiKeys(keyMap);
      setBaseUrls(urlMap);
    } catch {
      // Silently handle
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const provider = getProvider(selectedProvider);

  const startNewChat = () => {
    setChatMessages([]);
    setCurrentConversationId(null);
    setInput('');
  };

  const createConversation = async (firstMessage: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: firstMessage.slice(0, 50),
          provider: selectedProvider,
          model: selectedModel,
          systemPrompt,
        }),
      });
      const conv = await res.json();
      setCurrentConversationId(conv.id);
      return conv.id;
    } catch {
      toast.error('Failed to create conversation');
      return null;
    }
  };

  const saveMessage = async (conversationId: string, message: ChatMessage) => {
    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          model: message.model,
          provider: message.provider,
          tokensIn: message.tokensIn,
          tokensOut: message.tokensOut,
          latencyMs: message.latencyMs,
          costUsd: message.costUsd,
        }),
      });
    } catch {
      // Silently handle
    }
  };

  const sendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isStreaming) return;

    const apiKey = apiKeys[selectedProvider];
    if (selectedProvider !== 'ollama' && selectedProvider !== 'custom' && !apiKey) {
      toast.error('No API key configured for this provider. Go to Settings to add one.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
    };

    addChatMessage(userMessage);
    setInput('');
    setIsStreaming(true);

    // Create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation(trimmedInput);
      if (!convId) {
        setIsStreaming(false);
        return;
      }
    }

    // Save user message
    await saveMessage(convId, userMessage);

    // Prepare messages for API
    const apiMessages = chatMessages
      .filter(m => m.role !== 'system')
      .concat(userMessage)
      .map(m => ({ role: m.role, content: m.content }));

    // Add assistant placeholder
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      provider: selectedProvider,
      model: selectedModel,
    };
    addChatMessage(assistantMessage);

    try {
      abortRef.current = new AbortController();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          messages: apiMessages,
          apiKey,
          baseUrl: baseUrls[selectedProvider],
          temperature,
          maxTokens,
          topP,
          stream: true,
          systemPrompt,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let fullContent = '';
      let tokensIn = 0;
      let tokensOut = 0;
      let costUsd = 0;
      let latencyMs = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'delta') {
                fullContent += parsed.content;
                updateLastAssistantMessage(fullContent);
              } else if (parsed.type === 'done') {
                tokensIn = parsed.tokensIn || 0;
                tokensOut = parsed.tokensOut || 0;
                costUsd = parsed.costUsd || 0;
                latencyMs = parsed.latencyMs || 0;
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }

      // Save assistant message to DB
      await saveMessage(convId, {
        ...assistantMessage,
        content: fullContent,
        tokensIn,
        tokensOut,
        costUsd,
        latencyMs,
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        updateLastAssistantMessage(`❌ Error: ${errorMsg}`);
        toast.error(errorMsg);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, apiKeys, baseUrls, selectedProvider, selectedModel, chatMessages, currentConversationId, temperature, maxTokens, topP, systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const stopStreaming = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const selectModelAndSwitch = (providerId: string, modelId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel(modelId);
    toast.success(`Switched to ${getProvider(providerId)?.models.find(m => m.id === modelId)?.name || modelId}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-sm h-9">
              <span className="text-base">{provider?.icon}</span>
              <span className="truncate font-medium">{provider?.models.find(m => m.id === selectedModel)?.name || selectedModel}</span>
              <ChevronDown className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
            {PROVIDERS.map((p) => (
              <DropdownMenuSub key={p.id}>
                <DropdownMenuSubTrigger className="gap-2">
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                  {p.models.map((m) => (
                    <DropdownMenuItem
                      key={m.id}
                      onClick={() => selectModelAndSwitch(p.id, m.id)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="font-medium text-sm">{m.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.contextWindow >= 1000000 ? `${(m.contextWindow / 1000000).toFixed(0)}M ctx` : `${(m.contextWindow / 1000).toFixed(0)}K ctx`} • {m.inputPricePer1k > 0 ? `$${(m.inputPricePer1k * 1000).toFixed(2)}` : 'Free'}/M in
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Chat?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">This will clear the current conversation.</p>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={startNewChat}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                New Chat
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-4">
            <div className="text-5xl">🤖</div>
            <h2 className="text-xl font-semibold">AI Hub</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Chat with any AI model. Select a provider and model above, then start typing.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['chat', 'code', 'vision'].map(cap => (
                <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>
              ))}
            </div>
          </div>
        )}
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center mt-0.5">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <div className="flex items-center gap-1 py-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                )
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}
              {msg.role === 'assistant' && msg.tokensIn > 0 && msg.content && (
                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground">
                    {msg.tokensIn + msg.tokensOut} tokens
                  </span>
                  {msg.costUsd > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      ${msg.costUsd.toFixed(6)}
                    </span>
                  )}
                  {msg.latencyMs > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {msg.latencyMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="shrink-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t px-3 py-2 bg-background/95 backdrop-blur">
        <div className="flex items-end gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh]">
              <SheetHeader>
                <SheetTitle>Parameters</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 py-4 px-1">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Temperature</Label>
                    <span className="text-sm text-muted-foreground">{temperature.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[temperature]}
                    onValueChange={([v]) => setTemperature(v)}
                    min={0}
                    max={2}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Max Tokens</Label>
                    <span className="text-sm text-muted-foreground">{maxTokens}</span>
                  </div>
                  <Slider
                    value={[maxTokens]}
                    onValueChange={([v]) => setMaxTokens(v)}
                    min={256}
                    max={65536}
                    step={256}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Top P</Label>
                    <span className="text-sm text-muted-foreground">{topP.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[topP]}
                    onValueChange={([v]) => setTopP(v)}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">System Prompt</Label>
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="You are a helpful assistant..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl"
            rows={1}
          />

          {isStreaming ? (
            <Button
              variant="destructive"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl"
              onClick={stopStreaming}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl"
              onClick={sendMessage}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
