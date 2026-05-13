'use client';

import { useAppStore, ChatMessage, QUICK_PROMPTS } from '@/lib/store';
import { PROVIDERS, getProvider } from '@/lib/providers';
import { analyzeSentiment, getMoodAdaptivePrompt } from '@/lib/sentiment';
import { detectLanguage, SUPPORTED_LANGUAGES } from '@/lib/language';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import {
  Plus, Send, SlidersHorizontal, ChevronDown, Loader2, Bot, User, Trash2,
  Copy, RotateCcw, Sparkles, Hash, Check, X, Pencil,
  Camera, Mic, MicOff, Lightbulb, ScrollText, Hand, Languages, Image as ImageIcon,
} from 'lucide-react';
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

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function ChatView() {
  const {
    selectedProvider, setSelectedProvider, selectedModel, setSelectedModel,
    chatMessages, setChatMessages, addChatMessage, updateLastAssistantMessage,
    removeMessage, isStreaming, setIsStreaming,
    temperature, setTemperature, maxTokens, setMaxTokens, topP, setTopP,
    systemPrompt, setSystemPrompt,
    currentConversationId, setCurrentConversationId,
    memoryNotes, knowledgeDocs, userPrefs,
    pendingImages, addPendingImage, removePendingImage, clearPendingImages,
    isListening, setIsListening,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const [showPrompts, setShowPrompts] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextSummary, setContextSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffText, setHandoffText] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadApiKeys(); }, []);
  useEffect(() => {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  const loadApiKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const keys = await res.json();
      const keyMap: Record<string, string> = {};
      const urlMap: Record<string, string> = {};
      for (const key of keys) {
        if (!keyMap[key.provider]) keyMap[key.provider] = key.key;
        if (key.baseUrl && !urlMap[key.provider]) urlMap[key.provider] = key.baseUrl;
      }
      setApiKeys(keyMap);
      setBaseUrls(urlMap);
    } catch {}
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  const provider = getProvider(selectedProvider);
  const currentModel = provider?.models.find(m => m.id === selectedModel);
  const supportsVision = currentModel?.capabilities.includes('vision') ?? false;
  const estimatedInputTokens = estimateTokens(input + systemPrompt);
  const totalTokens = chatMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  const contextWindow = currentModel?.contextWindow || 128000;
  const contextUsagePercent = Math.min(100, (totalTokens / contextWindow) * 100);

  const startNewChat = () => {
    setChatMessages([]);
    setCurrentConversationId(null);
    setInput('');
    setContextSummary(null);
    clearPendingImages();
  };

  const createConversation = async (firstMessage: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: firstMessage.slice(0, 50), provider: selectedProvider, model: selectedModel, systemPrompt }),
      });
      const conv = await res.json();
      setCurrentConversationId(conv.id);
      return conv.id;
    } catch { return null; }
  };

  const saveMessage = async (conversationId: string, message: ChatMessage) => {
    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: message.role, content: message.content, model: message.model,
          provider: message.provider, tokensIn: message.tokensIn, tokensOut: message.tokensOut,
          latencyMs: message.latencyMs, costUsd: message.costUsd,
          sentiment: message.sentiment, language: message.language,
          imageUrls: message.imageUrls?.join(','),
        }),
      });
    } catch {}
  };

  const getMemoryContext = (): string => {
    if (!userPrefs?.enableMemory || memoryNotes.length === 0) return '';
    return memoryNotes.map(m => `${m.key}: ${m.value}`).join('\n');
  };

  const getRelevantKnowledge = (query: string): string => {
    if (knowledgeDocs.length === 0) return '';
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(w => w.length > 3);
    const relevant = knowledgeDocs.filter(doc =>
      words.some(w => doc.content.toLowerCase().includes(w) || doc.title.toLowerCase().includes(w))
    ).slice(0, 3);
    if (relevant.length === 0) return '';
    return relevant.map(d => `[${d.title}]: ${d.content.slice(0, 500)}`).join('\n\n');
  };

  const sendMessage = useCallback(async (overrideMessages?: { role: string; content: string | unknown[] }[]) => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && pendingImages.length === 0 && !overrideMessages) || isStreaming) return;

    const apiKey = apiKeys[selectedProvider];
    if (selectedProvider !== 'ollama' && selectedProvider !== 'custom' && !apiKey) {
      toast.error('No API key configured. Go to Settings to add one.');
      return;
    }

    let apiMessages: { role: string; content: string | unknown[] }[];
    let convId = currentConversationId;
    let userSentiment: 'positive' | 'negative' | 'neutral' | undefined;

    if (overrideMessages) {
      apiMessages = overrideMessages;
    } else {
      const sentiment = userPrefs?.enableSentiment !== false ? analyzeSentiment(trimmedInput) : null;
      userSentiment = sentiment?.label;
      const lang = detectLanguage(trimmedInput);

      let messageContent: string | unknown[] = trimmedInput;
      let imageUrls: string[] | undefined;

      if (pendingImages.length > 0 && supportsVision) {
        imageUrls = [...pendingImages];
        messageContent = [
          { type: 'text', text: trimmedInput || 'Describe this image' },
          ...pendingImages.map(url => ({ type: 'image_url', image_url: { url } })),
        ];
      } else if (pendingImages.length > 0 && !supportsVision) {
        toast.warning('Current model does not support vision. Images ignored.');
      }

      const userMessage: ChatMessage = {
        id: Date.now().toString(), role: 'user',
        content: typeof messageContent === 'string' ? messageContent : trimmedInput || 'Describe this image',
        sentiment: userSentiment, language: lang.code, imageUrls,
      };

      addChatMessage(userMessage);
      setInput('');
      clearPendingImages();
      setIsStreaming(true);

      if (!convId) {
        convId = await createConversation(trimmedInput || 'Image chat');
        if (!convId) { setIsStreaming(false); return; }
      }

      await saveMessage(convId, userMessage);

      apiMessages = chatMessages
        .filter(m => m.role !== 'system')
        .concat(userMessage)
        .map(m => {
          if (m.imageUrls && m.imageUrls.length > 0 && supportsVision) {
            return { role: m.role, content: [
              { type: 'text', text: m.content },
              ...m.imageUrls.map(url => ({ type: 'image_url', image_url: { url } })),
            ]};
          }
          return { role: m.role, content: m.content };
        });
    }

    setIsStreaming(true);

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(), role: 'assistant', content: '',
      provider: selectedProvider, model: selectedModel,
    };
    addChatMessage(assistantMessage);

    try {
      abortRef.current = new AbortController();

      let enhancedSystemPrompt = systemPrompt || '';
      if (userSentiment === 'negative') {
        enhancedSystemPrompt += getMoodAdaptivePrompt('negative');
      }
      const memCtx = getMemoryContext();
      if (memCtx) enhancedSystemPrompt += `\n\nUser context:\n${memCtx}`;
      if (contextSummary) enhancedSystemPrompt += `\n\nPrevious conversation summary: ${contextSummary}`;
      const knowledgeCtx = getRelevantKnowledge(typeof apiMessages[apiMessages.length - 1]?.content === 'string' ? (apiMessages[apiMessages.length - 1].content as string) : '');
      if (knowledgeCtx) enhancedSystemPrompt += `\n\nReference knowledge:\n${knowledgeCtx}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider, model: selectedModel, messages: apiMessages,
          apiKey, baseUrl: baseUrls[selectedProvider],
          temperature, maxTokens, topP, stream: true,
          systemPrompt: enhancedSystemPrompt || undefined,
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
      let tokensIn = 0, tokensOut = 0, costUsd = 0, latencyMs = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'delta') { fullContent += parsed.content; updateLastAssistantMessage(fullContent); }
              else if (parsed.type === 'done') { tokensIn = parsed.tokensIn || 0; tokensOut = parsed.tokensOut || 0; costUsd = parsed.costUsd || 0; latencyMs = parsed.latencyMs || 0; }
            } catch {}
          }
        }
      }

      if (convId) {
        await saveMessage(convId, { ...assistantMessage, content: fullContent, tokensIn, tokensOut, costUsd, latencyMs });
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        updateLastAssistantMessage(`❌ Error: ${errorMsg}`);
        toast.error(errorMsg);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, apiKeys, baseUrls, selectedProvider, selectedModel, chatMessages, currentConversationId, temperature, maxTokens, topP, systemPrompt, pendingImages, supportsVision, memoryNotes, userPrefs, contextSummary, knowledgeDocs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const copyMessage = async (msg: ChatMessage) => {
    try { await navigator.clipboard.writeText(msg.content); setCopiedId(msg.id); toast.success('Copied'); setTimeout(() => setCopiedId(null), 2000); }
    catch { toast.error('Failed to copy'); }
  };

  const regenerateLastResponse = () => {
    if (isStreaming || chatMessages.length < 2) return;
    let lastIdx = -1;
    for (let i = chatMessages.length - 1; i >= 0; i--) { if (chatMessages[i].role === 'assistant') { lastIdx = i; break; } }
    if (lastIdx === -1) return;
    removeMessage(chatMessages[lastIdx].id);
    const msgs = chatMessages.slice(0, lastIdx).filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
    if (msgs.length > 0) { setInput(''); sendMessage(msgs); }
  };

  const startEditing = (msg: ChatMessage) => { setEditingId(msg.id); setEditContent(msg.content); };
  const saveEditAndResend = () => {
    if (!editingId || !editContent.trim()) return;
    const idx = chatMessages.findIndex(m => m.id === editingId);
    if (idx === -1) return;
    const remaining = chatMessages.slice(0, idx);
    remaining[idx] = { ...remaining[idx], content: editContent.trim() };
    setChatMessages(remaining);
    setEditingId(null); setEditContent('');
    const apiMsgs = remaining.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
    setInput(''); setTimeout(() => sendMessage(apiMsgs), 100);
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { toast.error('Only images supported'); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); continue; }
      const reader = new FileReader();
      reader.onload = (e) => addPendingImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      (recognitionRef.current as { stop?: () => void })?.stop?.();
      setIsListening(false);
      return;
    }
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported'); return; }
    const recognition = new (SR as new () => { continuous?: boolean; interimResults?: boolean; lang?: string; onresult?: (e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void; onerror?: () => void; onend?: () => void; start?: () => void; stop?: () => void })();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = userPrefs?.language ? `${userPrefs.language}-US` : 'en-US';
    let final = '';
    recognition.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) setInput(prev => prev + final);
      final = '';
    };
    recognition.onerror = () => { setIsListening(false); toast.error('Voice error'); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start?.();
    setIsListening(true);
    toast.info('Listening... Speak now');
  };

  const summarizeContext = async () => {
    if (chatMessages.length < 4 || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const convText = chatMessages.filter(m => m.role !== 'system').map(m => `${m.role}: ${m.content}`).join('\n\n');
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider, model: selectedModel,
          messages: [{ role: 'user', content: `Summarize concisely:\n\n${convText}` }],
          apiKey: apiKeys[selectedProvider], baseUrl: baseUrls[selectedProvider],
          temperature: 0.3, maxTokens: 1024, stream: false,
          systemPrompt: 'You are a concise summarizer.',
        }),
      });
      const data = await res.json();
      setContextSummary(data.content);
      toast.success('Context summarized');
    } catch { toast.error('Summarization failed'); }
    finally { setIsSummarizing(false); }
  };

  const generateHandoff = () => {
    const now = new Date().toLocaleString();
    const sc = { positive: 0, negative: 0, neutral: 0 };
    chatMessages.forEach(m => { if (m.sentiment) sc[m.sentiment as keyof typeof sc]++; });
    let text = `=== HUMAN HANDOFF ===\nTime: ${now}\nProvider: ${provider?.name}\nModel: ${selectedModel}\nMessages: ${chatMessages.length}\nSentiment: ${sc.positive}+ / ${sc.negative}- / ${sc.neutral}=\n\n`;
    if (contextSummary) text += `SUMMARY:\n${contextSummary}\n\n`;
    if (memoryNotes.length > 0) { text += `USER CONTEXT:\n`; memoryNotes.forEach(m => text += `${m.key}: ${m.value}\n`); text += '\n'; }
    text += `CONVERSATION:\n`;
    chatMessages.forEach(m => { text += `${m.role === 'user' ? '👤' : '🤖'}${m.sentiment ? ` [${m.sentiment}]` : ''}: ${m.content}\n\n`; });
    setHandoffText(text);
    setShowHandoff(true);
  };

  return (
    <div className="flex flex-col h-full" onDragOver={(e) => { e.preventDefault(); if (supportsVision) setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); if (supportsVision) handleImageUpload(e.dataTransfer.files); }}>
      {/* Top Bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-background/95 backdrop-blur">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2 text-sm h-9">
              <span className="text-base">{provider?.icon}</span>
              <span className="truncate font-medium">{currentModel?.name || selectedModel}</span>
              <ChevronDown className="h-3.5 w-3.5 ml-auto opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
            {PROVIDERS.map((p) => (
              <DropdownMenuSub key={p.id}>
                <DropdownMenuSubTrigger className="gap-2"><span>{p.icon}</span><span>{p.name}</span></DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                  {p.models.map((m) => (
                    <DropdownMenuItem key={m.id} onClick={() => { setSelectedProvider(p.id); setSelectedModel(m.id); toast.success(`Switched to ${m.name}`); }} className="flex flex-col items-start gap-0.5">
                      <span className="font-medium text-sm">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.contextWindow >= 1000000 ? `${(m.contextWindow / 1000000).toFixed(0)}M` : `${(m.contextWindow / 1000).toFixed(0)}K`} ctx • {m.capabilities.includes('vision') && '👁️ '}{m.inputPricePer1k > 0 ? `$${(m.inputPricePer1k * 1000).toFixed(2)}` : 'Free'}/M</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip><TooltipTrigger asChild><div className="flex items-center gap-1 shrink-0 px-1"><span className="text-[10px] text-muted-foreground">{chatMessages.length}</span><Progress value={contextUsagePercent} className="h-1.5 w-10" /></div></TooltipTrigger><TooltipContent>~{totalTokens.toLocaleString()} / {contextWindow.toLocaleString()} tokens</TooltipContent></Tooltip>

        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowPrompts(!showPrompts)}><Sparkles className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Prompts</TooltipContent></Tooltip>

        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={generateHandoff}><Hand className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Human Handoff</TooltipContent></Tooltip>

        <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><Plus className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>New Chat?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Clear current conversation?</p><div className="flex gap-2 justify-end"><Button onClick={startNewChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">New Chat</Button></div></DialogContent></Dialog>
      </div>

      {/* Quick Prompts */}
      {showPrompts && (
        <div className="border-b px-3 py-2 bg-muted/30">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-muted-foreground">Quick Prompts</span><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowPrompts(false)}><X className="h-3 w-3" /></Button></div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">{QUICK_PROMPTS.map(qp => (<button key={qp.id} onClick={() => { setSystemPrompt(qp.prompt); setShowPrompts(false); toast.success('Prompt applied'); }} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border text-xs hover:bg-accent transition-colors"><span>{qp.icon}</span><span>{qp.name}</span></button>))}</div>
        </div>
      )}

      {/* Summarize banner */}
      {chatMessages.length > 20 && !contextSummary && (
        <div className="border-b px-3 py-1.5 bg-amber-500/10 flex items-center justify-between gap-2">
          <span className="text-xs text-amber-600 dark:text-amber-400">Long conversation — summarize to save context</span>
          <Button variant="outline" size="sm" className="h-6 text-[10px] shrink-0" onClick={summarizeContext} disabled={isSummarizing}>{isSummarizing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ScrollText className="h-3 w-3 mr-1" />}Summarize</Button>
        </div>
      )}
      {contextSummary && (
        <div className="border-b px-3 py-1.5 bg-emerald-500/10 flex items-center gap-2">
          <ScrollText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400 truncate">Context summarized</span>
          <Button variant="ghost" size="icon" className="h-4 w-4 ml-auto shrink-0" onClick={() => setContextSummary(null)}><X className="h-2.5 w-2.5" /></Button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-3 py-4 space-y-4 ${dragOver ? 'bg-primary/5' : ''}`}>
        {dragOver && supportsVision && (<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80"><div className="flex flex-col items-center gap-2 text-primary"><Camera className="h-8 w-8" /><p className="text-sm font-medium">Drop image here</p></div></div>)}

        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-4">
            <div className="text-5xl">🤖</div>
            <h2 className="text-xl font-semibold">AI Hub</h2>
            <p className="text-sm text-muted-foreground max-w-xs">Chat with any AI model. Supports text, images, voice, and more.</p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">{['chat', 'code', 'vision', 'voice'].map(cap => <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>)}</div>
            <div className="mt-4 space-y-2 w-full max-w-sm">
              <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
              {['Explain quantum computing simply', 'Write a Python sort function', 'Best practices for REST APIs?'].map(s => (<button key={s} onClick={() => setInput(s)} className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors truncate">{s}</button>))}
            </div>
          </div>
        )}

        {chatMessages.map((msg, idx) => {
          const sentimentBadge = msg.sentiment === 'positive' ? '😊' : msg.sentiment === 'negative' ? '😞' : null;
          return (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center mt-0.5"><Bot className="h-4 w-4 text-muted-foreground" /></div>}
              <div className="max-w-[85%] group">
                {editingId === msg.id ? (
                  <div className="space-y-2"><Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="text-sm min-h-[60px]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) saveEditAndResend(); if (e.key === 'Escape') setEditingId(null); }} /><div className="flex gap-1.5 justify-end"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button><Button size="sm" className="h-7 text-xs" onClick={saveEditAndResend}>Save & Resend</Button></div></div>
                ) : (
                  <>
                    <div className={`rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                      {msg.imageUrls && msg.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">{msg.imageUrls.map((url, i) => <img key={i} src={url} alt="" className="max-h-32 rounded-lg object-cover" />)}</div>
                      )}
                      {msg.role === 'assistant' ? (msg.content ? <MarkdownRenderer content={msg.content} /> : <div className="flex items-center gap-1 py-1"><Loader2 className="h-3 w-3 animate-spin" /><span className="text-xs text-muted-foreground">Thinking...</span></div>) : <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                      {(sentimentBadge || msg.language) && msg.role === 'user' && (
                        <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-primary-foreground/20">
                          {sentimentBadge && <span className="text-[10px]">{sentimentBadge}</span>}
                          {msg.language && msg.language !== 'en' && <span className="text-[10px] opacity-70">{msg.language}</span>}
                        </div>
                      )}
                      {msg.role === 'assistant' && msg.tokensIn > 0 && msg.content && (
                        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-border/30">
                          <span className="text-[10px] text-muted-foreground">{msg.tokensIn + msg.tokensOut} tokens</span>
                          {msg.costUsd > 0 && <span className="text-[10px] text-muted-foreground">${msg.costUsd.toFixed(6)}</span>}
                          {msg.latencyMs > 0 && <span className="text-[10px] text-muted-foreground">{msg.latencyMs}ms</span>}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    {msg.content && (
                      <div className={`flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => copyMessage(msg)}>{copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>
                        {msg.role === 'user' && <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => startEditing(msg)}><Pencil className="h-3 w-3" /></Button>}
                        {msg.role === 'assistant' && idx === chatMessages.length - 1 && !isStreaming && <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={regenerateLastResponse}><RotateCcw className="h-3 w-3" /></Button>}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeMessage(msg.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </>
                )}
              </div>
              {msg.role === 'user' && editingId !== msg.id && <div className="shrink-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center mt-0.5"><User className="h-4 w-4 text-primary-foreground" /></div>}
            </div>
          );
        })}
      </div>

      {/* Pending images */}
      {pendingImages.length > 0 && (
        <div className="border-t px-3 py-2 bg-muted/30 flex gap-2 overflow-x-auto">
          {pendingImages.map((url, i) => (
            <div key={i} className="relative shrink-0"><img src={url} alt="" className="h-12 w-12 rounded-lg object-cover" /><button onClick={() => removePendingImage(url)} className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="h-2.5 w-2.5" /></button></div>
          ))}
        </div>
      )}

      {/* Handoff dialog */}
      <Dialog open={showHandoff} onOpenChange={setShowHandoff}><DialogContent className="max-h-[80vh]"><DialogHeader><DialogTitle>Human Handoff</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground mb-2">Copy this context summary for a human agent:</p><Textarea value={handoffText} readOnly rows={10} className="text-xs" /><div className="flex gap-2 justify-end"><Button size="sm" onClick={async () => { await navigator.clipboard.writeText(handoffText); toast.success('Copied to clipboard'); }}>Copy All</Button></div></DialogContent></Dialog>

      {/* Input Area */}
      <div className="border-t px-3 py-2 bg-background/95 backdrop-blur">
        <div className="flex items-end gap-1.5">
          <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><SlidersHorizontal className="h-4 w-4" /></Button></SheetTrigger><SheetContent side="bottom" className="h-auto max-h-[70vh]"><SheetHeader><SheetTitle>Parameters</SheetTitle></SheetHeader><div className="space-y-5 py-4 px-1"><div className="space-y-2"><div className="flex justify-between"><Label className="text-sm">Temperature</Label><span className="text-sm text-muted-foreground">{temperature.toFixed(2)}</span></div><Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={2} step={0.01} /></div><div className="space-y-2"><div className="flex justify-between"><Label className="text-sm">Max Tokens</Label><span className="text-sm text-muted-foreground">{maxTokens}</span></div><Slider value={[maxTokens]} onValueChange={([v]) => setMaxTokens(v)} min={256} max={65536} step={256} /></div><div className="space-y-2"><div className="flex justify-between"><Label className="text-sm">Top P</Label><span className="text-sm text-muted-foreground">{topP.toFixed(2)}</span></div><Slider value={[topP]} onValueChange={([v]) => setTopP(v)} min={0} max={1} step={0.01} /></div><div className="space-y-2"><Label className="text-sm">System Prompt</Label><Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="You are a helpful assistant..." rows={3} className="text-sm" /></div></div></SheetContent></Sheet>

          {supportsVision && (<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()}><Camera className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Upload Image</TooltipContent></Tooltip>)}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />

          {voiceSupported && (<Tooltip><TooltipTrigger asChild><Button variant={isListening ? 'destructive' : 'ghost'} size="icon" className="h-9 w-9 shrink-0" onClick={toggleVoiceInput}>{isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent>{isListening ? 'Stop' : 'Voice Input'}</TooltipContent></Tooltip>)}

          <div className="flex-1 relative">
            <Textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl pr-14" rows={1} />
            {input.length > 0 && (<div className="absolute right-2 bottom-1.5 flex items-center gap-1"><Hash className="h-3 w-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">~{estimatedInputTokens}</span></div>)}
          </div>

          {isStreaming ? (<Button variant="destructive" size="icon" className="h-9 w-9 shrink-0 rounded-xl" onClick={() => abortRef.current?.abort()}><X className="h-4 w-4" /></Button>) : (<Button size="icon" className="h-9 w-9 shrink-0 rounded-xl" onClick={() => sendMessage()} disabled={!input.trim() && pendingImages.length === 0}><Send className="h-4 w-4" /></Button>)}
        </div>
      </div>
    </div>
  );
}
