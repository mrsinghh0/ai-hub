---
Task ID: 1-8
Agent: Main Agent
Task: Add API key auto-check, message actions, quick prompts, and other features

Work Log:
- Created `/api/keys/test/route.ts` - API key validation endpoint that tests keys by making minimal requests to each provider
- Created `/api/models/route.ts` - Endpoint to auto-fetch available models from Ollama/Custom providers
- Updated store with new state: KeyTestResult, QUICK_PROMPTS, discoveredModels, removeMessage, updateMessageContent
- Rewrote chat-view.tsx with: message copy, regenerate, edit & resend, delete, quick prompts bar, token counter, suggested prompts
- Rewrote settings-view.tsx with: API key testing per provider, "Test All Keys" button, collapsible provider status with test results, show/hide key toggle, connection info section
- Rewrote history-view.tsx with: conversation rename, export as Markdown, dropdown action menu, conversation count badge
- All lint checks pass, app verified working

Stage Summary:
- API key auto-validation: Tests keys against each provider's API with minimal requests, shows green/red status, latency, model availability
- Message actions: Copy, edit & resend (removes subsequent messages and resends), regenerate last response, delete individual messages
- Quick prompts: 12 pre-built system prompts (General, Code Expert, Debug, Code Review, Writer, Summarizer, Translator, Tutor, Data Analyst, Creative, Shell Expert, System Architect)
- Token counter: Shows estimated token count as user types
- Suggested prompts: 3 starter prompts shown in empty chat state
- Conversation management: Inline rename, export as Markdown with full metadata
- Key visibility toggle: Show/hide full API key values
- "Test All Keys" button: Tests all configured providers at once
