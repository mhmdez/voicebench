# VoiceBench v2

> Voice Agent Observatory + Arena  
> "Chatbot Arena meets Hamming, but open source and for speech-to-speech."

An open-source platform for blind A/B comparison of speech-to-speech AI models with Elo rankings and automated evaluation metrics.

## Features

### 🎯 Arena Mode
- **Blind A/B Comparisons** - Listen to two anonymous AI responses and vote for the best one
- **Category Selection** - Compare providers across different scenarios (general, customer-support, creative, multilingual, etc.)
- **Elo Leaderboard** - Track provider rankings with crowd-sourced human preferences
- **Confidence Intervals** - Statistical significance displayed after sufficient matches

### 📊 Evaluation Framework
- **Automated Evaluations** - Run systematic benchmarks against multiple providers
- **LLM Judge Scoring** - AI-powered quality assessment across accuracy, helpfulness, naturalness, and efficiency
- **WER Calculation** - Word Error Rate for transcription accuracy
- **Latency Metrics** - Time-to-first-byte (TTFB) and total response time
- **Export Support** - Download results as JSON or CSV

### 🔌 Provider Adapters
- **OpenAI Realtime** - Full pipeline: Whisper → GPT-4o → TTS
- **Extensible Architecture** - Easy to add new providers (Gemini, ElevenLabs, custom)
- **Health Checks** - Verify provider connectivity and authentication

## Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- SQLite (bundled via better-sqlite3)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/voicebench-v2.git
cd voicebench-v2

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access VoiceBench.

### Environment Variables

Create a `.env.local` file:

```env
# Required for provider testing and evaluations
OPENAI_API_KEY=sk-...

# Optional: Judge model configuration
JUDGE_MODEL=gpt-4o
JUDGE_API_KEY=sk-...  # Defaults to OPENAI_API_KEY if not set

# Optional: Whisper transcription
WHISPER_API_KEY=sk-...  # Defaults to OPENAI_API_KEY if not set
```

## Configuration

### Adding Providers

Configure voice AI providers via the Settings page or API:

```bash
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4o Nova",
    "type": "openai",
    "config": {
      "apiKey": "sk-...",
      "model": "gpt-4o",
      "voiceId": "nova"
    }
  }'
```

### Importing Scenarios

Import evaluation scenarios from YAML:

```bash
curl -X POST http://localhost:3000/api/scenarios/import \
  -H "Content-Type: application/json" \
  -d '{
    "yaml": "version: \"1.0\"\nscenarios:\n  - id: greeting-basic\n    name: Basic Greeting\n    type: task-completion\n    prompt: \"Hello, how are you today?\"\n    expected_outcome: \"A friendly greeting response\"",
    "mode": "skip"
  }'
```

See [docs/SCENARIOS.md](./docs/SCENARIOS.md) for YAML schema reference.

## Development

### Project Structure

```
voicebench-v2/
├── src/
│   ├── app/              # Next.js App Router pages & API routes
│   │   ├── api/          # REST API endpoints
│   │   ├── arena/        # Arena comparison UI
│   │   ├── eval/         # Evaluation dashboard
│   │   ├── leaderboard/  # Public rankings
│   │   └── settings/     # Provider configuration
│   ├── components/       # React components
│   ├── db/               # Drizzle ORM schemas
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Core business logic
│   │   ├── eval/         # Evaluation engine, judge, WER
│   │   ├── providers/    # Provider adapters
│   │   └── services/     # Domain services
│   ├── stores/           # Zustand state management
│   └── types/            # TypeScript interfaces
├── data/                 # SQLite database files
├── public/               # Static assets & audio files
└── docs/                 # Documentation
```

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema directly (dev)
npm run db:studio    # Open Drizzle Studio
```

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite + Drizzle ORM
- **UI**: React 19, Radix UI, Tailwind CSS
- **State**: Zustand, SWR
- **Validation**: Zod

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System design and data flow
- [Provider Guide](./docs/PROVIDERS.md) - Adding new provider adapters
- [Scenario Schema](./docs/SCENARIOS.md) - YAML format reference
- [API Reference](./docs/API.md) - Complete endpoint documentation

## Arena Mode

1. **Select Category** - Choose a scenario type (general, customer-support, etc.)
2. **Listen to Prompt** - Hear the audio prompt that both providers respond to
3. **Play Responses** - Listen to Response A and Response B (provider identity hidden)
4. **Vote** - Choose "A is better", "B is better", or "Tie"
5. **See Results** - Provider identity revealed, Elo ratings updated

## Evaluation Mode

1. **Create Run** - Select providers and scenarios to evaluate
2. **Execute** - System calls each provider, records responses
3. **Score** - LLM judge evaluates quality, WER calculated
4. **Analyze** - View aggregated metrics, per-provider breakdowns
5. **Export** - Download results as JSON or CSV

## Contributing

Contributions welcome! Please read our contributing guidelines and submit PRs.

## License

MIT License - see [LICENSE](./LICENSE) for details.
