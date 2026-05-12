'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Search, MessageSquare, Trash2, Clock, Download, Pencil, Check, X,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore, ChatMessage } from '@/lib/store';
import { getProvider } from '@/lib/providers';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ConversationItem {
  id: string;
  title: string;
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  systemPrompt: string | null;
  _count: { messages: number };
}

interface ConversationDetail {
  id: string;
  title: string;
  provider: string;
  model: string;
  systemPrompt: string | null;
  messages: {
    id: string;
    role: string;
    content: string;
    model: string | null;
    provider: string | null;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    latencyMs: number;
    sentiment: string | null;
    language: string | null;
    imageUrls: string | null;
    createdAt: string;
  }[];
}

export function HistoryView() {
  const { setActiveTab, setSelectedProvider, setSelectedModel, setChatMessages, setCurrentConversationId, setSystemPrompt } = useAppStore();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations(data);
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (conv: ConversationItem) => {
    try {
      const res = await fetch(`/api/conversations/${conv.id}`);
      const data: ConversationDetail = await res.json();

      setSelectedProvider(conv.provider);
      setSelectedModel(conv.model);
      setCurrentConversationId(conv.id);
      setSystemPrompt(data.systemPrompt || '');

      const messages: ChatMessage[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        model: m.model || undefined,
        provider: m.provider || undefined,
        tokensIn: m.tokensIn,
        tokensOut: m.tokensOut,
        costUsd: m.costUsd,
        latencyMs: m.latencyMs,
        sentiment: m.sentiment || undefined,
        language: m.language || undefined,
        imageUrls: m.imageUrls ? m.imageUrls.split(',') : undefined,
      }));

      setChatMessages(messages);
      setActiveTab('chat');
    } catch {
      toast.error('Failed to load conversation');
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  // Rename conversation
  const startRenaming = (conv: ConversationItem) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`/api/conversations/${id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, title: editTitle.trim() } : c)
      );
      setEditingId(null);
      toast.success('Conversation renamed');
    } catch {
      toast.error('Failed to rename conversation');
    }
  };

  // Export conversation as markdown
  const exportConversation = async (conv: ConversationItem) => {
    try {
      const res = await fetch(`/api/conversations/${conv.id}`);
      const data: ConversationDetail = await res.json();

      let markdown = `# ${conv.title}\n\n`;
      markdown += `**Provider:** ${getProvider(conv.provider)?.name || conv.provider}\n`;
      markdown += `**Model:** ${conv.model}\n`;
      markdown += `**Date:** ${new Date(conv.createdAt).toLocaleString()}\n`;
      if (data.systemPrompt) {
        markdown += `**System Prompt:** ${data.systemPrompt}\n`;
      }
      markdown += `\n---\n\n`;

      let totalTokensIn = 0;
      let totalTokensOut = 0;
      let totalCost = 0;

      for (const msg of data.messages) {
        if (msg.role === 'system') continue;
        const roleLabel = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
        markdown += `### ${roleLabel}\n\n${msg.content}\n\n`;

        if (msg.tokensIn > 0 || msg.tokensOut > 0) {
          markdown += `> Tokens: ${msg.tokensIn} in / ${msg.tokensOut} out`;
          if (msg.costUsd > 0) markdown += ` | Cost: $${msg.costUsd.toFixed(6)}`;
          if (msg.latencyMs > 0) markdown += ` | Latency: ${msg.latencyMs}ms`;
          markdown += '\n\n';
        }

        totalTokensIn += msg.tokensIn;
        totalTokensOut += msg.tokensOut;
        totalCost += msg.costUsd;
      }

      markdown += `---\n\n`;
      markdown += `**Summary:** ${data.messages.length} messages | ${totalTokensIn + totalTokensOut} tokens | $${totalCost.toFixed(4)} cost\n`;

      // Create and download the file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conv.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Conversation exported as Markdown');
    } catch {
      toast.error('Failed to export conversation');
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.model.toLowerCase().includes(search.toLowerCase()) ||
    c.provider.toLowerCase().includes(search.toLowerCase())
  );

  const providerIcon = (providerId: string) => getProvider(providerId)?.icon || '🔧';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">History</h1>
          <Badge variant="outline" className="text-[10px]">
            {conversations.length} conversations
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No matching conversations' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <Card
                key={conv.id}
                className="hover:bg-accent/50 transition-colors"
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => openConversation(conv)}
                    >
                      {editingId === conv.id ? (
                        <div className="flex items-center gap-1.5 mb-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename(conv.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => saveRename(conv.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-base">{providerIcon(conv.provider)}</span>
                          <h3 className="text-sm font-medium truncate">{conv.title}</h3>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {conv.model.split('/').pop()}
                        </Badge>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          {conv._count.messages}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>

                    {/* Action Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openConversation(conv)}>
                          <MessageSquare className="h-3.5 w-3.5 mr-2" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startRenaming(conv)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportConversation(conv)}>
                          <Download className="h-3.5 w-3.5 mr-2" />
                          Export as Markdown
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete &quot;{conv.title}&quot; and all its messages.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteConversation(conv.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
