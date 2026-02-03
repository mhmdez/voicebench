<p align="center">
  <h1 align="center">🎙️ VoiceBench</h1>
  <p align="center">
    Open-source voice AI evaluation workbench for dev teams
  </p>
</p>

<p align="center">
  <a href="https://github.com/mhmdez/voicebench/blob/main/LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <a href="https://nextjs.org"><img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" /></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" /></a>
  <a href="https://tailwindcss.com"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white" /></a>
  <a href="https://orm.drizzle.team"><img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black" /></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-providers">Providers</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## What is VoiceBench?

**VoiceBench** is an open-source evaluation workbench for teams building voice AI applications. Hook up your voice providers, run conversations against evaluation prompts, and get comprehensive metrics — both auto-detected and human-rated.

Think of it as the missing dev tool between "it sounds okay" and "we have data."

- 🎯 **Live Eval** — Start conversations with any provider, rate responses in real time
- 📊 **Auto Metrics** — TTFB, latency, WER, speech rate, audio duration — measured automatically
- 👤 **Human Ratings** — One-click thumbs up/down for naturalness, prosody, emotion, accuracy, helpfulness, efficiency, turn-taking, interruption handling
- 📈 **Analytics** — Cross-session analysis by provider, prompt, and metric with CSV export
- 🔌 **Multi-Provider** — OpenAI Realtime, Google Gemini, Retell AI, and custom adapters

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+**
- **npm** or **pnpm**
- SQLite (bundled via better-sqlite3)

### Installation

```bash
git clone https://github.com/mhmdez/voicebench.git
cd voicebench

npm install

cp .env.example .env.local
# Add your provider API keys to .env.local

npm run db:push

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the Live Eval page.

### Environment Variables

```env
# Database (SQLite, local by default)
DATABASE_URL=./data/voicebench.db

# Provider keys (add via Settings UI or env)
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
RETELL_API_KEY=...

# Judge model for automated scoring (optional)
JUDGE_MODEL=gpt-4o
JUDGE_API_KEY=sk-...

# Whisper for transcription/WER (optional)
WHISPER_API_KEY=sk-...
```

## ✨ Features

### Live Eval

The core workflow: pick a provider, pick a prompt (or freestyle), and start talking.

1. **Choose provider + prompt** — Select from configured providers and 75+ built-in evaluation scenarios
2. **Converse** — Multi-turn conversation with the voice agent
3. **Rate per turn** — Quick thumbs up/down on 8 quality dimensions
4. **Watch metrics** — Auto-detected metrics update live with sparkline trends
5. **End & save** — Session saved with full metrics for cross-session analysis

### Auto-Detected Metrics

Measured automatically during every conversation:

| Metric | What it measures |
|--------|-----------------|
| **TTFB** | Time to first byte — how fast the agent starts responding |
| **Response Time** | Total end-to-end latency |
| **Word Count** | Response verbosity |
| **Speech Rate** | Words per minute |
| **WER** | Word Error Rate — transcription accuracy |
| **Audio Duration** | Length of audio responses |

### Human Rating Metrics

One-click per turn, per metric. Captures what only humans can judge:

| Metric | What it captures |
|--------|-----------------|
| **Naturalness** | Does it sound like a real person? |
| **Prosody** | Rhythm, stress, intonation quality |
| **Emotion** | Appropriate emotional expression |
| **Accuracy** | Factual correctness of responses |
| **Helpfulness** | Did it actually help with the task? |
| **Efficiency** | Got to the point without rambling? |
| **Turn-taking** | Natural conversation flow and timing |
| **Interruption Handling** | Graceful handling of user interruptions |

### Analytics Dashboard

Results page with three analysis views:

- **Overview** — Provider comparison (avg TTFB, human ratings) with horizontal bar charts
- **By Prompt** — Which scenarios each provider handles best/worst
- **By Metric** — Per-metric distribution across all sessions (positive/negative/neutral)

Plus: CSV export, date range filtering, provider and status filters.

### Prompts Library

75+ built-in evaluation scenarios across categories:

- **Task Completion** — Booking, ordering, scheduling
- **Information Retrieval** — Questions, lookups, fact-checking
- **Conversation Flow** — Multi-turn dialogue, context retention

Create custom prompts or import from YAML.

## 🔌 Providers

Extensible adapter architecture:

| Provider | Type | Status |
|----------|------|--------|
| **OpenAI Realtime** | `openai` | ✅ Built-in |
| **Google Gemini** | `gemini` | ✅ Built-in |
| **Retell AI** | `retell` | ✅ Built-in |
| **ElevenLabs** | `elevenlabs` | Coming soon |
| **Custom** | `custom` | Bring your own endpoint |

Add providers via the Settings UI or API:

```bash
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4o Realtime",
    "type": "openai",
    "config": { "apiKey": "sk-...", "model": "gpt-4o-realtime", "voiceId": "nova" }
  }'
```

### Writing a Custom Adapter

```typescript
import { ProviderAdapter } from '@/lib/providers/base-adapter';
import type { AudioPrompt, ProviderResponse } from '@/lib/providers/types';

export class MyAdapter extends ProviderAdapter {
  async generateResponse(prompt: AudioPrompt): Promise<ProviderResponse> {
    // Your voice provider logic here
  }
}
```

## 🏗️ Architecture

```
voicebench/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── eval/         # Sessions, turns, ratings, analytics
│   │   │   ├── providers/    # Provider CRUD + health checks
│   │   │   └── scenarios/    # Prompt management + YAML import
│   │   ├── eval/
│   │   │   ├── live/         # Live conversation + real-time metrics
│   │   │   └── demo/         # Demo with sample data
│   │   ├── results/          # Analytics dashboard + session detail
│   │   ├── prompts/          # Scenario library management
│   │   └── settings/         # Provider configuration
│   ├── components/
│   │   ├── layout/           # Sidebar navigation
│   │   ├── settings/         # Provider form + list
│   │   └── ui/               # shadcn/ui components
│   ├── db/                   # Drizzle ORM schemas
│   ├── lib/
│   │   ├── providers/        # Adapter system (OpenAI, Gemini, Retell)
│   │   ├── eval/             # WER calculator, metrics, judge
│   │   └── services/         # Business logic
│   └── types/                # TypeScript interfaces
├── data/                     # SQLite database
└── public/                   # Static assets
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, React 19) |
| **Language** | TypeScript 5 |
| **Database** | SQLite + Drizzle ORM |
| **UI** | shadcn/ui, Tailwind CSS 4 |
| **State** | Zustand |
| **Validation** | Zod |

## 📜 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:push      # Push schema to DB
npm run db:seed      # Seed sample data
npm run db:studio    # Open Drizzle Studio
```

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Make sure `npm run build` passes
4. Open a PR

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.

---

<p align="center">
  Built for teams shipping voice AI
</p>
