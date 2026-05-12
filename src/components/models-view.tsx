'use client';

import { PROVIDERS, getProvider } from '@/lib/providers';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Zap } from 'lucide-react';
import { toast } from 'sonner';

export function ModelsView() {
  const { setActiveTab, setSelectedProvider, setSelectedModel } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string | null>(null);

  const filteredProviders = PROVIDERS
    .filter(p => p.id !== 'custom')
    .filter(p => !selectedProviderFilter || p.id === selectedProviderFilter)
    .map(p => ({
      ...p,
      models: p.models.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        m.capabilities.some(c => c.toLowerCase().includes(search.toLowerCase()))
      ),
    }))
    .filter(p => p.models.length > 0);

  const selectModel = (providerId: string, modelId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel(modelId);
    setActiveTab('chat');
    const provider = getProvider(providerId);
    const model = provider?.models.find(m => m.id === modelId);
    toast.success(`Selected ${model?.name || modelId}`);
  };

  const formatContext = (ctx: number) => {
    if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(1)}M`;
    if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K`;
    return ctx.toString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold mb-3">Models</h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models, capabilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setSelectedProviderFilter(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !selectedProviderFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {PROVIDERS.filter(p => p.id !== 'custom').map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProviderFilter(p.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedProviderFilter === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Models List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <div className="space-y-4">
          {filteredProviders.map((provider) => (
            <div key={provider.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{provider.icon}</span>
                <h2 className="text-sm font-semibold">{provider.name}</h2>
                <span className="text-xs text-muted-foreground">{provider.models.length} models</span>
              </div>
              <div className="space-y-2">
                {provider.models.map((model) => (
                  <Card
                    key={model.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
                    onClick={() => selectModel(provider.id, model.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium truncate">{model.name}</h3>
                            {model.inputPricePer1k === 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                Free
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{model.id}</p>
                        </div>
                        <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {formatContext(model.contextWindow)} ctx
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {formatContext(model.maxTokens)} out
                        </Badge>
                        {model.inputPricePer1k > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            ${(model.inputPricePer1k * 1000).toFixed(2)}/M in
                          </Badge>
                        )}
                        {model.capabilities.map((cap) => (
                          <Badge
                            key={cap}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
