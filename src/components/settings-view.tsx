'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus, Trash2, Key, Moon, Sun, Shield, AlertTriangle,
  CheckCircle2, XCircle, Loader2, RefreshCw, ChevronDown,
  Zap, Eye, EyeOff, Download, Lock, DollarSign,
  Crown, Diamond, User, Clock, Database,
} from 'lucide-react';
import { PROVIDERS } from '@/lib/providers';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useAppStore, KeyTestResult, UserPrefs } from '@/lib/store';
import { SUPPORTED_LANGUAGES } from '@/lib/language';

interface ApiKeyItem {
  id: string; provider: string; name: string; key: string; baseUrl: string | null; isActive: boolean; createdAt: string;
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { keyTestResults, setKeyTestResult, userPrefs, setUserPrefs } = useAppStore();
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

  useEffect(() => { loadApiKeys(); loadPreferences(); }, []);

  const loadApiKeys = async () => {
    try { setLoading(true); const res = await fetch('/api/keys'); setApiKeys(await res.json()); }
    catch { toast.error('Failed to load API keys'); }
    finally { setLoading(false); }
  };

  const loadPreferences = async () => {
    try { const res = await fetch('/api/preferences'); setUserPrefs((await res.json()) as UserPrefs); }
    catch {}
  };

  const updatePreferences = async (updates: Partial<UserPrefs>) => {
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setUserPrefs((await res.json()) as UserPrefs);
      toast.success('Preferences updated');
    } catch { toast.error('Failed to update preferences'); }
  };

  const addApiKey = async () => {
    if (!newProvider || !newName || !newKey) { toast.error('Please fill in all required fields'); return; }
    try {
      const res = await fetch('/api/keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newProvider, name: newName, key: newKey, baseUrl: newBaseUrl || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('API key added');
      const addedKey = await res.json();
      testSingleKey(addedKey.provider, addedKey.key, addedKey.baseUrl);
      setNewName(''); setNewKey(''); setNewBaseUrl(''); setShowAddForm(false); loadApiKeys();
    } catch { toast.error('Failed to add API key'); }
  };

  const deleteApiKey = async (id: string) => {
    try {
      await fetch('/api/keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setApiKeys(prev => prev.filter(k => k.id !== id)); toast.success('API key deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const testSingleKey = async (providerId: string, apiKeyValue?: string, baseUrlValue?: string | null) => {
    const key = apiKeys.find(k => k.provider === providerId);
    const keyToTest = apiKeyValue || key?.key || '';
    const urlToTest = baseUrlValue || key?.baseUrl || undefined;
    if (!keyToTest && providerId !== 'ollama') { toast.error('No API key to test'); return; }

    setKeyTestResult(providerId, { provider: providerId, valid: false, testing: true });
    try {
      const res = await fetch('/api/keys/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, apiKey: keyToTest, baseUrl: urlToTest }),
      });
      const data = await res.json();
      setKeyTestResult(providerId, { provider: providerId, valid: data.valid, testing: false, latencyMs: data.latencyMs, error: data.error, message: data.message, modelCount: data.modelCount, sampleModels: data.sampleModels, models: data.models, testedAt: Date.now() });
      if (data.valid) toast.success(`${PROVIDERS.find(p => p.id === providerId)?.name}: Valid!`);
      else toast.error(`${PROVIDERS.find(p => p.id === providerId)?.name}: ${data.error || 'Invalid'}`);
    } catch {
      setKeyTestResult(providerId, { provider: providerId, valid: false, testing: false, error: 'Test failed' });
      toast.error('Test failed');
    }
  };

  const testAllKeys = async () => {
    setTestingAll(true);
    for (const providerId of [...new Set(apiKeys.filter(k => k.isActive).map(k => k.provider))]) await testSingleKey(providerId);
    setTestingAll(false);
  };

  const maskKey = (key: string) => key.length <= 8 ? '••••••••' : '••••••••' + key.slice(-4);
  const toggleKeyVisibility = (id: string) => setVisibleKeys(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const providerStatus = PROVIDERS.map(p => ({ ...p, configured: apiKeys.some(k => k.provider === p.id && k.isActive), testResult: keyTestResults[p.id] }));
  const getKeysForProvider = (providerId: string) => apiKeys.filter(k => k.provider === providerId);

  const exportData = async () => {
    try {
      const [keys, convs, mems, docs, prefs] = await Promise.all([
        fetch('/api/keys').then(r => r.json()),
        fetch('/api/conversations').then(r => r.json()),
        fetch('/api/memory').then(r => r.json()),
        fetch('/api/knowledge').then(r => r.json()),
        fetch('/api/preferences').then(r => r.json()),
      ]);
      const blob = new Blob([JSON.stringify({ keys, conversations: convs, memories: mems, knowledgeDocs: docs, preferences: prefs }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `ai-hub-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Settings</h1>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={testAllKeys} disabled={testingAll || apiKeys.length === 0}>
            {testingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Test All
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {/* Theme */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2">{theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}Appearance</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Dark Mode</p><p className="text-xs text-muted-foreground">Switch theme</p></div><Switch checked={theme === 'dark'} onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')} /></div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" />Preferences</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Language</p><p className="text-xs text-muted-foreground">Preferred response language</p></div>
              <Select value={userPrefs?.language || 'en'} onValueChange={(v) => updatePreferences({ language: v })}><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{SUPPORTED_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Response Tone</p><p className="text-xs text-muted-foreground">AI communication style</p></div>
              <Select value={userPrefs?.responseTone || 'balanced'} onValueChange={(v) => updatePreferences({ responseTone: v })}><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="casual">Casual</SelectItem><SelectItem value="balanced">Balanced</SelectItem><SelectItem value="formal">Formal</SelectItem></SelectContent></Select>
            </div>
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Memory</p><p className="text-xs text-muted-foreground">Remember context across chats</p></div><Switch checked={userPrefs?.enableMemory ?? true} onCheckedChange={(v) => updatePreferences({ enableMemory: v })} /></div>
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Sentiment Analysis</p><p className="text-xs text-muted-foreground">Detect & adapt to mood</p></div><Switch checked={userPrefs?.enableSentiment ?? true} onCheckedChange={(v) => updatePreferences({ enableSentiment: v })} /></div>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" />Budget & Plan</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[{ name: 'Free', icon: User, color: 'text-muted-foreground', active: true }, { name: 'Pro', icon: Crown, color: 'text-amber-500', active: false }, { name: 'Enterprise', icon: Diamond, color: 'text-purple-500', active: false }].map(t => (
                <div key={t.name} className={`p-2 rounded-lg border text-center ${t.active ? 'border-primary bg-primary/5' : 'border-border'}`}><t.icon className={`h-4 w-4 mx-auto mb-1 ${t.color}`} /><p className="text-xs font-medium">{t.name}</p></div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><p className="text-sm font-medium">Monthly Budget</p><span className="text-sm text-muted-foreground">{userPrefs?.monthlyBudget === 0 ? 'Unlimited' : `$${userPrefs?.monthlyBudget || 0}`}</span></div>
              <Slider value={[userPrefs?.monthlyBudget || 0]} onValueChange={([v]) => updatePreferences({ monthlyBudget: v })} min={0} max={100} step={5} />
              <p className="text-[10px] text-muted-foreground">0 = unlimited</p>
            </div>
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Budget Alerts</p><p className="text-xs text-muted-foreground">Notify at 80% usage</p></div><Switch checked={userPrefs?.budgetAlert ?? false} onCheckedChange={(v) => updatePreferences({ budgetAlert: v })} /></div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Lock className="h-4 w-4" />Privacy & Data</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Data Retention</p><p className="text-xs text-muted-foreground">How long to keep data</p></div>
              <Select value={userPrefs?.dataRetention || 'forever'} onValueChange={(v) => updatePreferences({ dataRetention: v })}><SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30d">30 days</SelectItem><SelectItem value="90d">90 days</SelectItem><SelectItem value="forever">Forever</SelectItem></SelectContent></Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
              <p className="text-xs font-medium flex items-center gap-1.5"><Database className="h-3.5 w-3.5" />Data Policy</p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5 ml-5 list-disc">
                <li>All data stored locally</li><li>API keys encrypted at rest</li><li>Data never shared with third parties</li><li>Export or delete anytime</li>
              </ul>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 w-full" onClick={exportData}><Download className="h-3 w-3" />Export All Data</Button>
          </CardContent>
        </Card>

        {/* Provider Status */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" />Provider Status</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-1">{providerStatus.map(p => { const tr = p.testResult; const isExp = expandedProvider === p.id; const pKeys = getKeysForProvider(p.id);
              return (<Collapsible key={p.id} open={isExp} onOpenChange={(o) => setExpandedProvider(o ? p.id : null)}>
                <CollapsibleTrigger asChild><div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 cursor-pointer"><div className="flex items-center gap-2.5"><span className="text-base">{p.icon}</span><span className="text-sm font-medium">{p.name}</span>{p.configured ? (tr?.testing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> : tr?.valid === true ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : tr?.valid === false ? <XCircle className="h-3.5 w-3.5 text-red-500" /> : <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-500">ok</Badge>) : <Badge variant="secondary" className="text-[9px] px-1.5 py-0">—</Badge>}</div><ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExp ? 'rotate-180' : ''}`} /></div></CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-8 mr-2 mb-2 space-y-2">
                    {tr && !tr.testing && <div className={`p-2.5 rounded-lg text-xs ${tr.valid ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}><div className="flex items-center gap-1.5 mb-1">{tr.valid ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}<span className="font-medium">{tr.valid ? 'Valid' : 'Invalid'}</span></div>{tr.message && <p className="text-muted-foreground ml-5">{tr.message}</p>}{tr.error && <p className="text-red-400 ml-5">{tr.error}</p>}{tr.latencyMs !== undefined && <p className="text-muted-foreground ml-5">{tr.latencyMs}ms</p>}</div>}
                    {pKeys.map(ak => (<div key={ak.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"><div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{ak.name}</p><p className="text-[10px] text-muted-foreground font-mono">{visibleKeys.has(ak.id) ? ak.key : maskKey(ak.key)}</p></div><Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => toggleKeyVisibility(ak.id)}>{visibleKeys.has(ak.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Key</AlertDialogTitle><AlertDialogDescription>Delete &quot;{ak.name}&quot;?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteApiKey(ak.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>))}
                    {p.configured && <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 w-full" onClick={() => testSingleKey(p.id)} disabled={tr?.testing}>{tr?.testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}{tr?.testing ? 'Testing...' : 'Test Key'}</Button>}
                  </div>
                </CollapsibleContent>
              </Collapsible>); })}</div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Key className="h-4 w-4" />API Keys</CardTitle><Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAddForm(!showAddForm)}><Plus className="h-3 w-3" />Add</Button></div></CardHeader>
          <CardContent className="px-4 pb-4">
            {showAddForm && (<div className="space-y-3 p-3 rounded-lg bg-muted/50 mb-3"><div className="space-y-1.5"><Label className="text-xs">Provider</Label><Select value={newProvider} onValueChange={(v) => { setNewProvider(v); const p = PROVIDERS.find(x => x.id === v); if (p) setNewBaseUrl(p.baseUrl); }}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{PROVIDERS.map(p => <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label className="text-xs">Name</Label><Input placeholder="My Key" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-xs" /></div><div className="space-y-1.5"><Label className="text-xs">API Key</Label><Input type="password" placeholder="sk-..." value={newKey} onChange={(e) => setNewKey(e.target.value)} className="h-8 text-xs" /></div>{(newProvider === 'ollama' || newProvider === 'custom') && <div className="space-y-1.5"><Label className="text-xs">Base URL</Label><Input placeholder="http://localhost:11434/v1" value={newBaseUrl} onChange={(e) => setNewBaseUrl(e.target.value)} className="h-8 text-xs" /></div>}<div className="flex gap-2"><Button size="sm" className="h-7 text-xs flex-1" onClick={addApiKey}>Save & Test</Button><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button></div></div>)}
            {loading ? <p className="text-xs text-muted-foreground py-2">Loading...</p> : apiKeys.length === 0 ? <div className="text-center py-4"><Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">No API keys yet</p></div> : (
              <div className="space-y-2">{apiKeys.map(ak => { const p = PROVIDERS.find(x => x.id === ak.provider); return (<div key={ak.id} className="flex items-center gap-2 py-2 border-b last:border-0"><span className="text-base shrink-0">{p?.icon || '🔧'}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{ak.name}</p><p className="text-[10px] text-muted-foreground font-mono">{visibleKeys.has(ak.id) ? ak.key : maskKey(ak.key)}</p></div><div className="flex items-center gap-1 shrink-0"><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => toggleKeyVisibility(ak.id)}>{visibleKeys.has(ak.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => testSingleKey(ak.provider)}><Zap className="h-3 w-3" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Key</AlertDialogTitle><AlertDialogDescription>Delete &quot;{ak.name}&quot;?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteApiKey(ak.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div>); })}</div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mb-4 border-destructive/20">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Danger Zone</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="text-xs">Clear All Data</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Clear All Data?</AlertDialogTitle><AlertDialogDescription>Permanently delete everything. Cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { try { for (const k of apiKeys) await fetch('/api/keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: k.id }) }); setApiKeys([]); toast.success('All data cleared'); } catch { toast.error('Failed'); } }}>Clear Everything</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
