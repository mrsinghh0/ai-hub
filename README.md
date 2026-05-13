# AI Hub

**Unify multiple AI API providers in one place** — Web app + Mobile app (Android & iOS)

A full-stack application that brings together 9 AI providers (OpenRouter, NVIDIA NIM, OpenAI, Anthropic, Google AI, Groq, Together AI, Ollama, Custom) into a single, powerful interface with advanced features like streaming chat, RAG, sentiment analysis, language detection, and budget tracking.

---

## Features

### Core
- **9 AI Providers** — OpenRouter, NVIDIA NIM, OpenAI, Anthropic, Google AI, Groq, Together AI, Ollama, Custom
- **Streaming Chat** — Real-time SSE streaming for all providers
- **API Key Validation** — Auto-verify keys with one click
- **Model Browser** — Browse available models with pricing info

### Advanced
- **RAG (Retrieval-Augmented Generation)** — Upload knowledge documents for context-aware responses
- **Long-term Memory** — Persistent memory notes injected into conversations
- **Sentiment Analysis** — Real-time AFINN-based sentiment scoring on messages
- **Language Detection** — Auto-detect 15+ languages in messages
- **Multimodal Input** — Text + image support for vision-capable models
- **Voice Input** — Speech-to-text via Web Speech API / platform APIs
- **Budget Tracking** — Per-provider spending limits with threshold alerts
- **Conversation History** — Full CRUD with rename, export, and delete

### Security
- **Privacy Mode** — Option to disable third-party data sharing
- **Secure Storage** — API keys stored locally, never sent to third parties
- **Data Retention** — Configurable memory and history retention

---

## Project Structure

```
ai-hub/
├── src/                          # Next.js Web App
│   ├── app/
│   │   ├── api/                  # Backend API routes
│   │   │   ├── chat/route.ts         # Streaming chat endpoint
│   │   │   ├── keys/route.ts         # API key management
│   │   │   ├── knowledge/route.ts    # RAG knowledge CRUD
│   │   │   ├── memory/route.ts       # Memory notes CRUD
│   │   │   ├── models/route.ts       # Model listing
│   │   │   ├── analytics/route.ts    # Usage statistics
│   │   │   ├── conversations/        # Conversation CRUD
│   │   │   ├── export/route.ts       # Data export
│   │   │   ├── preferences/route.ts  # User preferences
│   │   │   └── sentiment/route.ts    # Sentiment analysis
│   │   ├── page.tsx                  # Main app page
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles
│   ├── components/
│   │   ├── chat-view.tsx             # Chat interface
│   │   ├── settings-view.tsx         # API keys & preferences
│   │   ├── knowledge-view.tsx        # RAG documents + memory
│   │   ├── history-view.tsx          # Conversation history
│   │   ├── analytics-view.tsx        # Usage charts & stats
│   │   ├── models-view.tsx           # Model browser
│   │   ├── bottom-nav.tsx            # Navigation
│   │   ├── theme-provider.tsx        # Dark/light theme
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── store.ts                  # Zustand state management
│   │   ├── providers.ts              # Provider configurations
│   │   ├── sentiment.ts              # AFINN sentiment analysis
│   │   ├── language.ts               # Language detection
│   │   ├── db.ts                      # Prisma database client
│   │   └── utils.ts                  # Utility functions
│   └── hooks/
│       ├── use-mobile.ts             # Mobile detection hook
│       └── use-toast.ts              # Toast notifications hook
├── prisma/
│   └── schema.prisma                 # Database schema
├── mobile/                       # Flutter + Rust Mobile App
│   ├── flutter_app/
│   │   ├── lib/
│   │   │   ├── main.dart             # App entry
│   │   │   ├── screens/              # Chat, Knowledge, History, Analytics, Settings
│   │   │   ├── providers/            # Riverpod state management
│   │   │   ├── models/               # Freezed data models
│   │   │   ├── services/             # Bridge + Chat services
│   │   │   ├── themes/               # Material 3 theming
│   │   │   └── widgets/              # Reusable components
│   │   ├── android/                  # Android configuration
│   │   ├── ios/                      # iOS configuration
│   │   └── pubspec.yaml
│   ├── rust_core/
│   │   ├── src/
│   │   │   ├── api/                  # Chat, streaming, models
│   │   │   ├── providers/            # 9 provider adapters
│   │   │   ├── analysis/             # Sentiment + language detection
│   │   │   └── storage/              # SQLite database
│   │   └── Cargo.toml
│   └── README.md
├── .env.example                  # Environment template
├── LICENSE                       # MIT License
└── package.json
```

---

## Quick Start

### Web App (Next.js)

```bash
# 1. Clone the repository
git clone https://github.com/mrsinghh0/ai-hub.git
cd ai-hub

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 4. Initialize database
npx prisma db push

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Mobile App (Flutter + Rust)

```bash
cd mobile/flutter_app

# 1. Install Flutter dependencies
flutter pub get

# 2. Build Rust core
cd ../rust_core && cargo build

# 3. Generate bridge code
cd ../flutter_app
flutter_rust_bridge_codegen generate

# 4. Run on device
flutter run
```

---

## Supported Providers

| Provider | API Format | Streaming | Vision | Models |
|----------|-----------|-----------|--------|--------|
| OpenRouter | OpenAI-compatible | ✅ | ✅ | 100+ |
| NVIDIA NIM | Custom | ✅ | ✅ | 20+ |
| OpenAI | OpenAI | ✅ | ✅ | 15+ |
| Anthropic | Claude | ✅ | ✅ | 5+ |
| Google AI | Gemini | ✅ | ✅ | 10+ |
| Groq | OpenAI-compatible | ✅ | ❌ | 8+ |
| Together AI | OpenAI-compatible | ✅ | ✅ | 50+ |
| Ollama | Local | ✅ | ✅ | Custom |
| Custom | Configurable | ✅ | ✅ | Any |

---

## Tech Stack

### Web App
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript, shadcn/ui |
| State | Zustand |
| Database | Prisma + SQLite |
| Streaming | Server-Sent Events (SSE) |
| Styling | Tailwind CSS 4 |

### Mobile App
| Layer | Technology |
|-------|-----------|
| UI | Flutter 3.24+, Dart 3.5+ |
| State | Riverpod 2.5+ |
| Core Engine | Rust 1.77+ |
| Bridge | flutter_rust_bridge 2.0+ |
| Storage | SQLite (via Rust) |
| HTTP | reqwest (Rust), Dio (Dart) |

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in your API keys. You only need keys for the providers you want to use:

```env
DATABASE_URL="file:./dev.db"
OPENROUTER_API_KEY=sk-or-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AI...
GROQ_API_KEY=gsk_...
```

### Budget Limits

Set monthly spending limits per provider in the Settings screen. You'll receive alerts when approaching your budget threshold.

### RAG Knowledge Base

Upload text documents in the Knowledge tab. The system will automatically search and inject relevant context into your conversations using keyword matching.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Streaming chat with any provider |
| `/api/keys` | GET/POST | Manage API keys |
| `/api/keys/test` | POST | Validate an API key |
| `/api/models` | GET | List available models |
| `/api/conversations` | GET/POST | List/create conversations |
| `/api/conversations/[id]` | GET/DELETE | Get/delete conversation |
| `/api/knowledge` | GET/POST/DELETE | RAG document CRUD |
| `/api/memory` | GET/POST/DELETE | Memory notes CRUD |
| `/api/analytics` | GET | Usage statistics |
| `/api/sentiment` | POST | Analyze text sentiment |
| `/api/preferences` | GET/POST | User preferences |
| `/api/export` | POST | Export conversation data |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) — Beautiful UI components
- [flutter_rust_bridge](https://cjycode.com/flutter_rust_bridge/) — Flutter-Rust integration
- [OpenRouter](https://openrouter.ai/) — Unified AI model access
- [Prisma](https://www.prisma.io/) — Next-generation ORM
- [whatlang](https://github.com/greyblake/whatlang-rs) — Rust language detection
