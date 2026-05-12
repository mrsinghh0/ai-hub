'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Trash2, Key, Moon, Sun, Shield, AlertTriangle } from 'lucide-react';
import { PROVIDERS } from '@/lib/providers';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface ApiKeyItem {
  id: string;
  provider: string;
  name: string;
  key: string;
  baseUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState('openrouter');
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/keys');
      const data = await res.json();
      setApiKeys(data);
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = async () => {
    if (!newProvider || !newName || !newKey) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newProvider,
          name: newName,
          key: newKey,
          baseUrl: newBaseUrl || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add API key');
      }

      toast.success('API key added successfully');
      setNewName('');
      setNewKey('');
      setNewBaseUrl('');
      setShowAddForm(false);
      loadApiKeys();
    } catch {
      toast.error('Failed to add API key');
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast.success('API key deleted');
    } catch {
      toast.error('Failed to delete API key');
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return '••••••••' + key.slice(-4);
  };

  // Get provider status
  const providerStatus = PROVIDERS.map(p => ({
    ...p,
    configured: apiKeys.some(k => k.provider === p.id && k.isActive),
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {/* Theme */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Provider Status */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Provider Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {providerStatus.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.icon}</span>
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <Badge
                    variant={p.configured ? 'default' : 'secondary'}
                    className={`text-[10px] ${p.configured ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}`}
                  >
                    {p.configured ? '✓ Configured' : 'Not set'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Add Key Form */}
            {showAddForm && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/50 mb-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Provider</Label>
                  <Select value={newProvider} onValueChange={(v) => {
                    setNewProvider(v);
                    const provider = PROVIDERS.find(p => p.id === v);
                    if (provider) setNewBaseUrl(provider.baseUrl);
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.icon} {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="My API Key"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                {(newProvider === 'ollama' || newProvider === 'custom') && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Base URL</Label>
                    <Input
                      placeholder="http://localhost:11434/v1"
                      value={newBaseUrl}
                      onChange={(e) => setNewBaseUrl(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={addApiKey}>
                    Save Key
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Key List */}
            {loading ? (
              <p className="text-xs text-muted-foreground py-2">Loading...</p>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-4">
                <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No API keys configured</p>
                <p className="text-xs text-muted-foreground">Add a key to start chatting</p>
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((apiKey) => {
                  const provider = PROVIDERS.find(p => p.id === apiKey.provider);
                  return (
                    <div key={apiKey.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                      <span className="text-base shrink-0">{provider?.icon || '🔧'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{apiKey.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {maskKey(apiKey.key)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {provider?.name || apiKey.provider}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{apiKey.name}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteApiKey(apiKey.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mb-4 border-destructive/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="text-xs">
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all conversations, messages, API keys, and usage logs. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        // Delete all keys
                        for (const key of apiKeys) {
                          await fetch('/api/keys', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: key.id }),
                          });
                        }
                        setApiKeys([]);
                        toast.success('All data cleared');
                      } catch {
                        toast.error('Failed to clear data');
                      }
                    }}
                  >
                    Clear Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
