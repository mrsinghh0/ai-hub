import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all usage logs in the period
    const logs = await db.usageLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    // Summary stats
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(l => l.success).length;
    const totalTokensIn = logs.reduce((sum, l) => sum + l.tokensIn, 0);
    const totalTokensOut = logs.reduce((sum, l) => sum + l.tokensOut, 0);
    const totalCost = logs.reduce((sum, l) => sum + l.costUsd, 0);
    const avgLatency = totalRequests > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.latencyMs, 0) / totalRequests)
      : 0;

    // By provider
    const byProvider: Record<string, { requests: number; tokensIn: number; tokensOut: number; cost: number; latency: number }> = {};
    for (const log of logs) {
      if (!byProvider[log.provider]) {
        byProvider[log.provider] = { requests: 0, tokensIn: 0, tokensOut: 0, cost: 0, latency: 0 };
      }
      byProvider[log.provider].requests++;
      byProvider[log.provider].tokensIn += log.tokensIn;
      byProvider[log.provider].tokensOut += log.tokensOut;
      byProvider[log.provider].cost += log.costUsd;
      byProvider[log.provider].latency += log.latencyMs;
    }

    // Calculate average latency per provider
    for (const key of Object.keys(byProvider)) {
      byProvider[key].latency = Math.round(byProvider[key].latency / byProvider[key].requests);
    }

    // By model
    const byModel: Record<string, { requests: number; tokensIn: number; tokensOut: number; cost: number }> = {};
    for (const log of logs) {
      const modelKey = `${log.provider}/${log.model}`;
      if (!byModel[modelKey]) {
        byModel[modelKey] = { requests: 0, tokensIn: 0, tokensOut: 0, cost: 0 };
      }
      byModel[modelKey].requests++;
      byModel[modelKey].tokensIn += log.tokensIn;
      byModel[modelKey].tokensOut += log.tokensOut;
      byModel[modelKey].cost += log.costUsd;
    }

    // Daily usage
    const dailyUsage: Record<string, { date: string; requests: number; tokens: number; cost: number }> = {};
    for (const log of logs) {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!dailyUsage[date]) {
        dailyUsage[date] = { date, requests: 0, tokens: 0, cost: 0 };
      }
      dailyUsage[date].requests++;
      dailyUsage[date].tokens += log.tokensIn + log.tokensOut;
      dailyUsage[date].cost += log.costUsd;
    }

    const sortedDaily = Object.values(dailyUsage).sort((a, b) => a.date.localeCompare(b.date));

    // Top models by usage
    const topModels = Object.entries(byModel)
      .map(([key, val]) => ({ model: key, ...val }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        totalRequests,
        successfulRequests,
        totalTokensIn,
        totalTokensOut,
        totalCost,
        avgLatency,
      },
      byProvider,
      byModel,
      dailyUsage: sortedDaily,
      topModels,
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
