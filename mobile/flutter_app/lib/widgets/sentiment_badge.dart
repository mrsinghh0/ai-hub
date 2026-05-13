import 'package:flutter/material.dart';

class SentimentBadge extends StatelessWidget {
  final double score;
  const SentimentBadge({super.key, required this.score});

  @override
  Widget build(BuildContext context) {
    final (label, color) = _getLabel(score);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_getIcon(score), size: 10, color: color),
          const SizedBox(width: 2),
          Text(label, style: TextStyle(fontSize: 9, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  (String, Color) _getLabel(double score) {
    if (score <= -3) return ('Very Negative', Colors.red);
    if (score <= -1) return ('Negative', Colors.orange);
    if (score < 1) return ('Neutral', Colors.grey);
    if (score < 3) return ('Positive', Colors.lightGreen);
    return ('Very Positive', Colors.green);
  }

  IconData _getIcon(double score) {
    if (score <= -3) return Icons.sentiment_very_dissatisfied;
    if (score <= -1) return Icons.sentiment_dissatisfied;
    if (score < 1) return Icons.sentiment_neutral;
    if (score < 3) return Icons.sentiment_satisfied;
    return Icons.sentiment_very_satisfied;
  }
}
