'use client';

import { useState, useEffect } from 'react';
import { useAppStore, KnowledgeDoc, MemoryNote } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Trash2, BookOpen, Brain, FileText, Link, Search, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

export function KnowledgeView() {
  const { knowledgeDocs, setKnowledgeDocs, memoryNotes, setMemoryNotes } = useAppStore();
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocType, setNewDocType] = useState('text');
  const [newDocSource, setNewDocSource] = useState('');
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsRes, memRes] = await Promise.all([
        fetch('/api/knowledge'),
        fetch('/api/memory'),
      ]);
      setKnowledgeDocs(await docsRes.json());
      setMemoryNotes(await memRes.json());
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addDoc = async () => {
    if (!newDocTitle || !newDocContent) {
      toast.error('Title and content are required');
      return;
    }
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newDocTitle, content: newDocContent, type: newDocType, source: newDocSource || undefined }),
      });
      const doc = await res.json();
      setKnowledgeDocs([doc, ...knowledgeDocs]);
      setNewDocTitle('');
      setNewDocContent('');
      setNewDocSource('');
      setShowAddDoc(false);
      toast.success('Document added to knowledge base');
    } catch {
      toast.error('Failed to add document');
    }
  };

  const deleteDoc = async (id: string) => {
    try {
      await fetch('/api/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setKnowledgeDocs(knowledgeDocs.filter(d => d.id !== id));
      toast.success('Document removed');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const addMemory = async () => {
    if (!newMemoryKey || !newMemoryValue) {
      toast.error('Key and value are required');
      return;
    }
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newMemoryKey, value: newMemoryValue, source: 'manual' }),
      });
      const note = await res.json();
      setMemoryNotes([note, ...memoryNotes]);
      setNewMemoryKey('');
      setNewMemoryValue('');
      setShowAddMemory(false);
      toast.success('Memory note saved');
    } catch {
      toast.error('Failed to save memory');
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      await fetch('/api/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setMemoryNotes(memoryNotes.filter(m => m.id !== id));
      toast.success('Memory note removed');
    } catch {
      toast.error('Failed to delete memory');
    }
  };

  const filteredDocs = knowledgeDocs.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMemories = memoryNotes.filter(m =>
    m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold mb-3">Knowledge & Memory</h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge & memory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <Tabs defaultValue="knowledge" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="knowledge" className="flex-1 gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Knowledge Base
              {knowledgeDocs.length > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">{knowledgeDocs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="memory" className="flex-1 gap-1.5 text-xs">
              <Brain className="h-3.5 w-3.5" />
              Long-Term Memory
              {memoryNotes.length > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">{memoryNotes.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge" className="space-y-4">
            {/* Info card */}
            <Card className="border-dashed">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">RAG - Retrieval-Augmented Generation</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add documents to your knowledge base. When you chat, relevant content is automatically injected into the AI context for more accurate, up-to-date answers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add doc button */}
            <Button
              variant="outline"
              className="w-full h-12 border-dashed gap-2"
              onClick={() => setShowAddDoc(!showAddDoc)}
            >
              <Plus className="h-4 w-4" />
              Add Knowledge Document
            </Button>

            {/* Add doc form */}
            {showAddDoc && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input
                      placeholder="API Documentation, Company Policies..."
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <div className="flex gap-2">
                      {[
                        { id: 'text', label: 'Text', icon: FileText },
                        { id: 'url', label: 'URL', icon: Link },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setNewDocType(t.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors ${
                            newDocType === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted'
                          }`}
                        >
                          <t.icon className="h-3 w-3" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {newDocType === 'url' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">URL</Label>
                      <Input
                        placeholder="https://example.com/docs"
                        value={newDocSource}
                        onChange={(e) => setNewDocSource(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Content</Label>
                    <Textarea
                      placeholder="Paste your document content here..."
                      value={newDocContent}
                      onChange={(e) => setNewDocContent(e.target.value)}
                      rows={6}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={addDoc}>Save Document</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddDoc(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Document list */}
            {filteredDocs.length === 0 && !showAddDoc ? (
              <div className="text-center py-8">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No knowledge documents yet</p>
                <p className="text-xs text-muted-foreground">Add documents to enhance AI responses with your data</p>
              </div>
            ) : (
              filteredDocs.map(doc => (
                <Card key={doc.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {doc.type === 'url' ? <Link className="h-3.5 w-3.5 text-muted-foreground" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                          <h3 className="text-sm font-medium truncate">{doc.title}</h3>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">{doc.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.content}</p>
                        {doc.source && (
                          <p className="text-[10px] text-muted-foreground mt-1 truncate">{doc.source}</p>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>Remove &quot;{doc.title}&quot; from knowledge base?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteDoc(doc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            {/* Info card */}
            <Card className="border-dashed">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Long-Term Memory</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Save key facts, preferences, and details. These are automatically injected into AI context for personalized, context-aware responses across all conversations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full h-12 border-dashed gap-2"
              onClick={() => setShowAddMemory(!showAddMemory)}
            >
              <Plus className="h-4 w-4" />
              Add Memory Note
            </Button>

            {showAddMemory && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Key (e.g., "preferred_language", "my_name")</Label>
                    <Input
                      placeholder="my_name"
                      value={newMemoryKey}
                      onChange={(e) => setNewMemoryKey(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Value</Label>
                    <Textarea
                      placeholder="John"
                      value={newMemoryValue}
                      onChange={(e) => setNewMemoryValue(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={addMemory}>Save Memory</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddMemory(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredMemories.length === 0 && !showAddMemory ? (
              <div className="text-center py-8">
                <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No memory notes yet</p>
                <p className="text-xs text-muted-foreground">Save preferences and facts for personalized AI responses</p>
              </div>
            ) : (
              filteredMemories.map(note => (
                <Card key={note.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium">{note.key}</h3>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{note.source}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{note.value}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMemory(note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
