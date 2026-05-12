---
Task ID: 1-12
Agent: Main Agent
Task: Add NLP, multimodal, sentiment, memory, RAG, multilingual, budget, security, handoff features

Work Log:
- Updated prisma schema with MemoryNote, KnowledgeDoc, UserPreferences, and new Message fields (sentiment, language, imageUrls)
- Created sentiment.ts library with keyword-based sentiment analysis and mood-adaptive prompts
- Created language.ts library with language detection (CJK, Arabic, Devanagari, Cyrillic, etc.) and supported languages list
- Created API routes: /api/memory, /api/knowledge, /api/preferences
- Updated store with new state: memoryNotes, knowledgeDocs, userPrefs, isListening, pendingImages
- Rewrote chat-view with: image upload (paste/drag-drop/file picker), voice input (Web Speech API), sentiment badges, language detection, context window indicator, auto-summarization for long conversations, memory injection, knowledge retrieval (RAG), human handoff dialog, vision format support
- Created knowledge-view with tabs for Knowledge Base (RAG documents) and Long-Term Memory
- Updated settings-view with: language preference, response tone, memory toggle, sentiment toggle, budget slider, budget alerts, subscription tiers, data retention, data export, privacy policy
- Updated bottom-nav: replaced Models with Knowledge tab
- Updated page.tsx to render KnowledgeView
- Fixed chat API route naming conflict (stream variable)
- All lint checks pass, build succeeds, all endpoints verified working

Stage Summary:
- 10 major feature areas implemented: NLP/sentiment, multimodal (images+voice), contextual dialogue, long-term memory, RAG, multilingual, budgets/monetization, security/privacy, human handoff, knowledge base
- New database models: MemoryNote, KnowledgeDoc, UserPreferences + Message fields (sentiment, language, imageUrls)
- New API routes: /api/memory, /api/knowledge, /api/preferences
- New components: KnowledgeView
- Navigation updated: Chat, Knowledge, History, Analytics, Settings
