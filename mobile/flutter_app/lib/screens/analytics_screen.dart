import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_providers.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(usageStatsProvider);
    final totalCost = ref.read(usageStatsProvider.notifier).totalCost;
    final totalTokens = ref.read(usageStatsProvider.notifier).totalTokens;
    final totalRequests = ref.read(usageStatsProvider.notifier).totalRequests;
    final preferences = ref.watch(preferencesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Analytics')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Overview cards
            Row(
              children: [
                _StatCard(
                  title: 'Requests',
                  value: totalRequests.toString(),
                  icon: Icons.send_outlined,
                  color: Colors.blue,
                ),
                const SizedBox(width: 12),
                _StatCard(
                  title: 'Tokens',
                  value: _formatNumber(totalTokens),
                  icon: Icons.data_usage_outlined,
                  color: Colors.purple,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _StatCard(
                  title: 'Cost',
                  value: '\$${totalCost.toStringAsFixed(2)}',
                  icon: Icons.attach_money,
                  color: Colors.green,
                ),
                const SizedBox(width: 12),
                _StatCard(
                  title: 'Budget',
                  value: '\$${preferences.budgetLimit.toStringAsFixed(0)}',
                  icon: Icons.account_balance_wallet_outlined,
                  color: totalCost > preferences.budgetLimit ? Colors.red : Colors.orange,
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Budget progress
            if (preferences.budgetLimit > 0) ...[
              Text('Budget Usage', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: (totalCost / preferences.budgetLimit).clamp(0.0, 1.0),
                backgroundColor: Colors.grey.shade200,
                color: totalCost > preferences.budgetLimit * 0.8
                    ? Colors.red
                    : totalCost > preferences.budgetLimit * 0.5
                        ? Colors.orange
                        : Colors.green,
                minHeight: 8,
                borderRadius: BorderRadius.circular(4),
              ),
              const SizedBox(height: 4),
              Text(
                '${((totalCost / preferences.budgetLimit) * 100).toStringAsFixed(1)}% used',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 24),
            ],

            // Provider breakdown
            Text('Provider Breakdown', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            _ProviderBreakdown(stats: stats),
            const SizedBox(height: 24),

            // Recent activity
            Text('Recent Activity', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (stats.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: Text('No activity yet')),
                ),
              )
            else
              ...stats.take(10).map((s) => Card(
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                        child: Text(s.provider[0].toUpperCase()),
                      ),
                      title: Text(s.model, style: const TextStyle(fontSize: 13)),
                      subtitle: Text(
                        '${s.totalTokens} tokens  •  \$${s.cost.toStringAsFixed(4)}  •  ${s.latencyMs}ms',
                        style: const TextStyle(fontSize: 11),
                      ),
                      trailing: Text(
                        _timeAgo(s.createdAt),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  )),
          ],
        ),
      ),
    );
  }

  String _formatNumber(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(icon, color: color, size: 20),
                  Text(title, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
                ],
              ),
              const SizedBox(height: 8),
              Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProviderBreakdown extends StatelessWidget {
  final List<dynamic> stats;
  const _ProviderBreakdown({required this.stats});

  @override
  Widget build(BuildContext context) {
    final providerStats = <String, _ProviderStat>{};
    for (final s in stats) {
      final existing = providerStats[s.provider] ?? _ProviderStat();
      providerStats[s.provider] = _ProviderStat(
        requests: existing.requests + 1,
        tokens: existing.tokens + s.totalTokens as int,
        cost: existing.cost + s.cost,
      );
    }

    if (providerStats.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Center(child: Text('No data yet')),
        ),
      );
    }

    return Column(
      children: providerStats.entries.map((e) {
        final colors = [Colors.blue, Colors.purple, Colors.green, Colors.orange, Colors.red, Colors.cyan, Colors.pink, Colors.amber];
        final colorIndex = e.key.hashCode % colors.length;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                CircleAvatar(backgroundColor: colors[colorIndex].withOpacity(0.2), child: Text(e.key[0].toUpperCase())),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(e.key, style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text('${e.value.requests} requests  •  ${e.value.tokens} tokens', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ),
                Text('\$${e.value.cost.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _ProviderStat {
  final int requests;
  final int tokens;
  final double cost;
  _ProviderStat({this.requests = 0, this.tokens = 0, this.cost = 0.0});
}
