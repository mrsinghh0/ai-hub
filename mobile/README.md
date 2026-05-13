# AI Hub Mobile — Flutter + Rust

A cross-platform (Android & iOS) mobile app that unifies multiple AI API providers in one place, built with **Flutter** for the UI layer and **Rust** for the core engine.

## Architecture

```
mobile/
├── flutter_app/          # Flutter UI (Dart)
│   ├── lib/
│   │   ├── main.dart           # App entry point
│   │   ├── screens/            # Full-screen pages
│   │   ├── widgets/            # Reusable components
│   │   ├── services/           # API & bridge services
│   │   ├── models/             # Data models
│   │   ├── providers/          # State management (Riverpod)
│   │   ├── utils/              # Helpers & constants
│   │   └── themes/             # App theming
│   └── pubspec.yaml
├── rust_core/            # Rust backend engine
│   ├── src/
│   │   ├── lib.rs              # Library root
│   │   ├── api/                # API client implementations
│   │   ├── providers/          # Provider-specific adapters
│   │   ├── analysis/           # Sentiment, language detection
│   │   └── storage/            # SQLite, key-value store
│   └── Cargo.toml
└── README.md
```

## Features

- **9 AI Providers**: OpenRouter, NVIDIA NIM, OpenAI, Anthropic, Google AI, Groq, Together AI, Ollama, Custom
- **Streaming Chat**: Real-time SSE streaming responses
- **Multimodal Input**: Text + image support
- **Voice Input**: Speech-to-text via platform APIs
- **Sentiment Analysis**: Real-time AFINN-based sentiment scoring
- **Language Detection**: 15+ language auto-detection
- **RAG**: Knowledge base with document management
- **Long-term Memory**: Persistent conversation memory
- **Budget Tracking**: Per-provider spending limits & alerts
- **Dark/Light Theme**: Full theme support
- **Offline Storage**: SQLite via Rust for all data

## Prerequisites

- Flutter SDK >= 3.24.0
- Rust >= 1.77.0
- `flutter_rust_bridge_codegen` >= 2.0.0
- Android Studio / Xcode for platform builds
- Cargo-ndk for Android cross-compilation

## Setup

```bash
# 1. Install Flutter dependencies
cd mobile/flutter_app
flutter pub get

# 2. Install Rust dependencies
cd ../rust_core
cargo build

# 3. Generate bridge code
cd ../flutter_app
flutter_rust_bridge_codegen generate

# 4. Run on device
flutter run
```

## Build

```bash
# Android APK
flutter build apk --release

# iOS
flutter build ios --release
```

## Supported Providers

| Provider | API Format | Streaming | Models |
|----------|-----------|-----------|--------|
| OpenRouter | OpenAI-compatible | Yes | 100+ |
| NVIDIA NIM | Custom | Yes | 20+ |
| OpenAI | OpenAI | Yes | 15+ |
| Anthropic | Claude | Yes | 5+ |
| Google AI | Gemini | Yes | 10+ |
| Groq | OpenAI-compatible | Yes | 8+ |
| Together AI | OpenAI-compatible | Yes | 50+ |
| Ollama | Local | Yes | Custom |
| Custom | Configurable | Yes | Any |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | Flutter 3.24+, Dart 3.5+ |
| State | Riverpod 2.5+ |
| Core Engine | Rust 1.77+ |
| Bridge | flutter_rust_bridge 2.0+ |
| Storage | SQLite (via Rust) |
| HTTP | reqwest (Rust) |
| Crypto | ring (Rust) |
