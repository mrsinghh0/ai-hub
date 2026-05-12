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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus, Trash2, Key, Moon, Sun, Shield, AlertTriangle,
  CheckCircle2, XCircle, Loader2, RefreshCw, ChevronDown,
  Globe, Zap, Eye, EyeOff,
} from 'lucide-react';
import { PROVIDERS } from '@/lib/providers';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useAppStore, KeyTestResult } from '@/lib/store';

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
  const { keyTestResults, setKeyTestResult } = useAppStore();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState('openrouter');
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [testingAll, setTestingAll] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

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

      // Auto-test the new key
      const addedKey = await res.json();
      testSingleKey(addedKey.provider, addedKey.key, addedKey.baseUrl);

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

  // Test a single API key
  const testSingleKey = async (providerId: string, apiKeyValue?: string, baseUrlValue?: string | null) => {
    const key = apiKeys.find(k => k.provider === providerId);
    const keyToTest = apiKeyValue || key?.key || '';
    const urlToTest = baseUrlValue || key?.baseUrl || undefined;

    if (!keyToTest && providerId !== 'ollama') {
      toast.error('No API key to test');
      return;
    }

    // Set testing state
    setKeyTestResult(providerId, {
      provider: providerId,
      valid: false,
      testing: true,
    });

    try {
      const res = await fetch('/api/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          apiKey: keyToTest,
          baseUrl: urlToTest,
        }),
      });

      const data = await res.json();

      setKeyTestResult(providerId, {
        provider: providerId,
        valid: data.valid,
        testing: false,
        latencyMs: data.latencyMs,
        error: data.error,
        message: data.message,
        modelCount: data.modelCount,
        sampleModels: data.sampleModels,
        models: data.models,
        testedAt: Date.now(),
      });

      if (data.valid) {
        toast.success(`${PROVIDERS.find(p => p.id === providerId)?.name || providerId}: Key is valid!`);
      } else {
        toast.error(`${PROVIDERS.find(p => p.id === providerId)?.name || providerId}: ${data.error || 'Key is invalid'}`);
      }
    } catch {
      setKeyTestResult(providerId, {
        provider: providerId,
        valid: false,
        testing: false,
        error: 'Test request failed',
      });
      toast.error('Failed to test API key');
    }
  };

  // Test all configured keys
  const testAllKeys = async () => {
    setTestingAll(true);
    const configuredProviders = [...new Set(apiKeys.filter(k => k.isActive).map(k => k.provider))];

    for (const providerId of configuredProviders) {
      await testSingleKey(providerId);
    }

    setTestingAll(false);
    toast.success(`Tested ${configuredProviders.length} provider(s)`);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return '••••••••' + key.slice(-4);
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Get provider status with test results
  const providerStatus = PROVIDERS.map(p => ({
    ...p,
    configured: apiKeys.some(k => k.provider === p.id && k.isActive),
    testResult: keyTestResults[p.id],
  }));

  // Get keys for a specific provider
  const getKeysForProvider = (providerId: string) =>
    apiKeys.filter(k => k.provider === providerId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Settings</h1>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={testAllKeys}
            disabled={testingAll || apiKeys.length === 0}
          >
            {testingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Test All Keys
          </Button>
        </div>
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

        {/* Provider Status with Key Testing */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Provider Status & Key Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Test your API keys to verify they are valid and working. Click a provider to see details.
            </p>
            <div className="space-y-1">
              {providerStatus.map(p => {
                const testResult = p.testResult;
                const isExpanded = expandedProvider === p.id;
                const providerKeys = getKeysForProvider(p.id);

                return (
                  <Collapsible
                    key={p.id}
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedProvider(open ? p.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{p.icon}</span>
                          <span className="text-sm font-medium">{p.name}</span>
                          {/* Status indicator */}
                          {p.configured ? (
                            testResult?.testing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                            ) : testResult?.valid === true ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : testResult?.valid === false ? (
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                configured
                              </Badge>
                            )
                          ) : (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              not set
                            </Badge>
                          )}
                        </div>
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-8 mr-2 mb-2 space-y-2">
                        {/* Test result details */}
                        {testResult && !testResult.testing && (
                          <div className={`p-2.5 rounded-lg text-xs ${
                            testResult.valid
                              ? 'bg-emerald-500/10 border border-emerald-500/20'
                              : 'bg-red-500/10 border border-red-500/20'
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              {testResult.valid ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                              <span className="font-medium">{testResult.valid ? 'Valid & Working' : 'Invalid / Error'}</span>
                            </div>
                            {testResult.message && (
                              <p className="text-muted-foreground ml-5">{testResult.message}</p>
                            )}
                            {testResult.error && (
                              <p className="text-red-400 ml-5">{testResult.error}</p>
                            )}
                            {testResult.latencyMs !== undefined && (
                              <p className="text-muted-foreground ml-5">Latency: {testResult.latencyMs}ms</p>
                            )}
                            {testResult.sampleModels && testResult.sampleModels.length > 0 && (
                              <div className="ml-5 mt-1">
                                <span className="text-muted-foreground">Available: </span>
                                <span className="text-muted-foreground">{testResult.sampleModels.slice(0, 3).join(', ')}{testResult.modelCount && testResult.modelCount > 3 ? ` +${testResult.modelCount - 3} more` : ''}</span>
                              </div>
                            )}
                            {testResult.models && testResult.models.length > 0 && (
                              <div className="ml-5 mt-1">
                                <span className="text-muted-foreground">Models: {testResult.models.slice(0, 5).join(', ')}{testResult.models.length > 5 ? ` +${testResult.models.length - 5} more` : ''}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Provider keys list */}
                        {providerKeys.map(apiKey => (
                          <div key={apiKey.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{apiKey.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                              </p>
                              {apiKey.baseUrl && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  URL: {apiKey.baseUrl}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground"
                                onClick={() => toggleKeyVisibility(apiKey.id)}
                              >
                                {visibleKeys.has(apiKey.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3 w-3" />
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
                          </div>
                        ))}

                        {/* Test button */}
                        {p.configured && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5 w-full"
                            onClick={() => testSingleKey(p.id)}
                            disabled={testResult?.testing}
                          >
                            {testResult?.testing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3" />
                            )}
                            {testResult?.testing ? 'Testing...' : 'Test API Key'}
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* API Keys Management */}
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
                    Save & Test Key
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
                          {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {visibleKeys.has(apiKey.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => testSingleKey(apiKey.provider)}
                        >
                          <Zap className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
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
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Test Info */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Connection Info
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p>The key validation test sends a minimal API request to verify:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>API key is valid and authorized</li>
                <li>Provider server is reachable</li>
                <li>Available models can be listed</li>
                <li>Response latency is measured</li>
              </ul>
              <p className="mt-2">For Ollama, it checks if the local server is running and lists available models.</p>
              <p>Test results are shown with green (valid) or red (invalid) indicators next to each provider.</p>
            </div>
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
          <CardContent className="px-4 pb-4 space-y-2">
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
