'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, DollarSign, Zap, Clock, TrendingUp } from 'lucide-react';
import { getProvider } from '@/lib/providers';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    totalTokensIn: number;
    totalTokensOut: number;
    totalCost: number;
    avgLatency: number;
  };
  byProvider: Record<string, { requests: number; tokensIn: number; tokensOut: number; cost: number; latency: number }>;
  topModels: { model: string; requests: number; tokensIn: number; tokensOut: number; cost: number }[];
  dailyUsage: { date: string; requests: number; tokens: number; cost: number }[];
}

const CHART_COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316', '#ec4899', '#6366f1', '#84cc16'];

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics?days=${days}`);
      const d = await res.json();
      setData(d);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold">Analytics</h1>
        </div>
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const providerBarData = Object.entries(data.byProvider).map(([provider, val]) => ({
    name: getProvider(provider)?.name || provider,
    requests: val.requests,
    tokens: val.tokensIn + val.tokensOut,
    cost: parseFloat(val.cost.toFixed(4)),
  }));

  const pieData = Object.entries(data.byProvider).map(([provider, val]) => ({
    name: getProvider(provider)?.name || provider,
    value: parseFloat(val.cost.toFixed(4)),
  }));

  const dailyLineData = data.dailyUsage.map(d => ({
    ...d,
    date: d.date.slice(5), // MM-DD
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Analytics</h1>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Requests</span>
              </div>
              <p className="text-xl font-bold">{data.summary.totalRequests}</p>
              <p className="text-[10px] text-muted-foreground">{data.summary.successfulRequests} successful</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Tokens</span>
              </div>
              <p className="text-xl font-bold">
                {(data.summary.totalTokensIn + data.summary.totalTokensOut).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {data.summary.totalTokensIn.toLocaleString()} in / {data.summary.totalTokensOut.toLocaleString()} out
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Total Cost</span>
              </div>
              <p className="text-xl font-bold">${data.summary.totalCost.toFixed(4)}</p>
              <p className="text-[10px] text-muted-foreground">USD</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-sky-500" />
                <span className="text-xs text-muted-foreground">Avg Latency</span>
              </div>
              <p className="text-xl font-bold">{data.summary.avgLatency}ms</p>
              <p className="text-[10px] text-muted-foreground">response time</p>
            </CardContent>
          </Card>
        </div>

        {/* Provider Usage Chart */}
        {providerBarData.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Usage by Provider</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={providerBarData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number) => [value.toLocaleString(), '']}
                    />
                    <Bar dataKey="requests" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Usage Line Chart */}
        {dailyLineData.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Daily Usage</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyLineData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number) => [value.toLocaleString(), '']}
                    />
                    <Line type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="tokens" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cost Distribution Pie Chart */}
        {pieData.length > 0 && pieData.some(d => d.value > 0) && (
          <Card className="mb-6">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Cost Distribution</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Models */}
        {data.topModels.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Models
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {data.topModels.map((model, idx) => {
                  const [prov] = model.model.split('/');
                  const providerConfig = getProvider(prov);
                  return (
                    <div key={model.model} className="flex items-center gap-3 py-1.5">
                      <span className="text-sm font-mono text-muted-foreground w-5 text-right">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {providerConfig?.icon} {model.model.split('/').pop()}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{model.requests} requests</span>
                          <span className="text-[10px] text-muted-foreground">{(model.tokensIn + model.tokensOut).toLocaleString()} tokens</span>
                          {model.cost > 0 && (
                            <span className="text-[10px] text-muted-foreground">${model.cost.toFixed(4)}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{prov}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {data.summary.totalRequests === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <Activity className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No usage data yet</p>
            <p className="text-xs text-muted-foreground">Start chatting to see your analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}
