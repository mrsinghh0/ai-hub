import 'package:flutter/material.dart';

class LanguageBadge extends StatelessWidget {
  final String language;
  const LanguageBadge({super.key, required this.language});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.language, size: 10, color: Colors.blue),
          const SizedBox(width: 2),
          Text(
            language.toUpperCase(),
            style: const TextStyle(fontSize: 9, color: Colors.blue, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
