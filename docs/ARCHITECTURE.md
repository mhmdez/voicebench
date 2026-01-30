# Architecture

This document describes the technical architecture of VoiceBench v2.

## System Overview

VoiceBench is a Next.js application that provides two main modes:

1. **Arena Mode** - Blind A/B comparison of voice AI providers with Elo rankings
2. **Eval Mode** - Automated evaluation runs with LLM-judged quality metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │  Arena  │ │  Eval   │ │ Leaderboard │ │    Settings     │   │
│  └────┬────┘ └────┬────┘ └──────┬──────┘ └────────┬────────┘   │
└───────┼───────────┼─────────────┼─────────────────┼────────────┘
        │           │             │                 │
        ▼           ▼             ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                         │
│  /api/arena/*   /api/eval/*   /api/providers/*   /api/scenarios │
└────────────────────────────────┬────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐    ┌───────────────────┐    ┌───────────────────┐
│ Arena Service │    │   Eval Engine     │    │ Provider Service  │
│  - Matchmaking│    │   - Orchestration │    │  - CRUD           │
│  - Elo Rating │    │   - Judging       │    │  - Health Check   │
└───────┬───────┘    │   - Metrics       │    └─────────┬─────────┘
        │            └─────────┬─────────┘              │
        │                      │                        │
        ▼                      ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Provider Adapters                           │
│       ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│       │   OpenAI     │  │    Gemini    │  │   Custom     │     │
│       │   Realtime   │  │   (future)   │  │   Adapter    │     │
│       └──────┬───────┘  └──────────────┘  └──────────────┘     │
└──────────────┼──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External APIs                               │
│    OpenAI (Whisper + GPT + TTS)   |   Gemini   |   ElevenLabs  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     SQLite Database                             │
│   providers | ratings | prompts | matches | votes | scenarios   │
│   eval_runs | eval_results                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Frontend

#### Pages (App Router)

| Route | Description |
|-------|-------------|
| `/` | Home page with navigation to Arena and Eval |
| `/arena` | Arena comparison interface |
| `/leaderboard` | Public Elo rankings |
| `/eval` | Evaluation runs list |
| `/eval/new` | Create new evaluation run |
| `/eval/[id]` | Evaluation run details |
| `/settings` | Provider configuration |

#### Component Architecture

```
components/
├── arena/           # Arena-specific components
│   ├── match-view.tsx      # Main comparison UI
│   ├── response-card.tsx   # Individual response player
│   ├── vote-buttons.tsx    # Voting controls
│   ├── reveal-view.tsx     # Post-vote reveal
│   └── category-selector   # Category selection
├── audio/           # Shared audio components
│   ├── audio-player.tsx    # Generic audio player
│   └── waveform.tsx        # Audio visualization
├── charts/          # Visualization components
│   ├── elo-trend.tsx       # Elo over time
│   ├── metrics-bar.tsx     # Metric comparison bars
│   └── score-radar.tsx     # Multi-metric radar chart
├── eval/            # Evaluation components
│   ├── run-wizard.tsx      # Multi-step run creation
│   ├── results-table.tsx   # Results grid
│   └── result-detail.tsx   # Individual result view
├── layout/          # App layout components
│   ├── navbar.tsx          # Navigation
│   └── footer.tsx          # Footer
├── providers/       # Provider components
│   └── provider-card.tsx   # Provider display
├── settings/        # Settings components
│   ├── provider-form.tsx   # Add/edit provider
│   └── provider-list.tsx   # Provider management
└── ui/              # shadcn/ui primitives
```

### Backend

#### API Routes

All API routes follow REST conventions and return JSON:

```
/api
├── arena/
│   ├── match/       # POST: Generate match
│   ├── vote/        # POST: Submit vote
│   └── leaderboard/ # GET: Rankings
├── eval/
│   └── runs/
│       ├── route.ts      # GET: List, POST: Create
│       └── [id]/
│           ├── route.ts  # GET: Details
│           └── export/   # GET: Export CSV/JSON
├── providers/
│   ├── route.ts     # GET: List, POST: Create
│   └── [id]/
│       ├── route.ts # GET/PUT/DELETE
│       └── test/    # POST: Health check
└── scenarios/
    ├── route.ts     # GET: List, POST: Create
    └── import/      # POST: YAML import
```

#### Core Services

**Arena Service** (`lib/services/arena-service.ts`)
- Match generation with provider pairing
- Random prompt selection by category
- Mock match generation for demo mode

**Elo Service** (`lib/services/elo-service.ts`)
- Bradley-Terry Elo calculation
- Per-category and overall ratings
- Win/tie/loss tracking

**Provider Service** (`lib/services/provider-service.ts`)
- Provider CRUD operations
- API key masking for security
- Health check execution

**Matchmaking Service** (`lib/services/matchmaking.ts`)
- Provider selection algorithm
- Match count balancing
- Same-provider avoidance

#### Evaluation Engine

```
lib/eval/
├── eval-engine.ts      # Main orchestration
├── judge-service.ts    # LLM quality assessment
├── judge-prompts.ts    # Prompt templates
├── whisper-service.ts  # Audio transcription
├── wer-calculator.ts   # Word Error Rate
├── metrics-collector.ts # Latency aggregation
├── scenario-parser.ts  # YAML parsing
└── scenario-schema.ts  # Zod validation
```

**Eval Engine Flow:**

1. Load run configuration (providers, scenarios)
2. For each scenario (sequential):
   - For each provider (parallel):
     - Load prompt audio (if available)
     - Call provider adapter
     - Transcribe response (Whisper)
     - Calculate WER
     - Judge quality (LLM)
     - Persist result
3. Update run progress
4. Mark run complete

### Provider Adapters

Provider adapters implement the `ProviderAdapter` abstract class:

```typescript
abstract class ProviderAdapter {
  abstract generateResponse(prompt: AudioPrompt): Promise<ProviderResponse>;
  abstract healthCheck(): Promise<ProviderHealthCheck>;
  abstract getName(): string;
}
```

**OpenAI Realtime Adapter** (`lib/providers/openai-realtime-adapter.ts`)

Pipeline: Whisper (STT) → GPT-4o (Chat) → TTS

```
Audio Input → Transcription → LLM Response → Speech Synthesis → Audio Output
     │              │               │                │              │
     └── Whisper ───┘── GPT-4o ────┘──── TTS ───────┘              │
                                                                    │
     Latency Metrics: transcriptionMs + completionMs + ttsMs = total
```

### Database Schema

VoiceBench uses SQLite with Drizzle ORM.

#### Core Tables

```sql
-- Voice AI providers
providers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'openai' | 'gemini' | 'elevenlabs' | 'custom'
  config JSON NOT NULL,  -- API keys, model, voice settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Elo ratings per provider per category
ratings (
  id INTEGER PRIMARY KEY,
  provider_id INTEGER REFERENCES providers,
  category TEXT NOT NULL,  -- 'general' | 'customer-support' | etc.
  elo INTEGER DEFAULT 1500,
  match_count INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  tie_count INTEGER DEFAULT 0,
  UNIQUE(provider_id, category)
)

-- Audio prompts for arena matches
prompts (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP
)

-- Arena matches
matches (
  id TEXT PRIMARY KEY,
  prompt_id TEXT REFERENCES prompts,
  provider_a_id INTEGER REFERENCES providers,
  provider_b_id INTEGER REFERENCES providers,
  response_a_url TEXT,
  response_b_url TEXT,
  latency_a_ms INTEGER,
  latency_b_ms INTEGER,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'completed' | 'expired'
  voted_at TIMESTAMP,
  created_at TIMESTAMP
)

-- User votes on matches
votes (
  id TEXT PRIMARY KEY,
  match_id TEXT REFERENCES matches,
  winner TEXT NOT NULL,  -- 'A' | 'B' | 'tie'
  session_id TEXT NOT NULL,
  created_at TIMESTAMP
)

-- Evaluation scenarios
scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'task-completion' | 'information-retrieval' | 'conversation-flow'
  prompt TEXT NOT NULL,
  expected_outcome TEXT NOT NULL,
  prompt_audio_url TEXT,
  tags JSON DEFAULT '[]',
  language TEXT DEFAULT 'en',
  difficulty TEXT DEFAULT 'medium',  -- 'easy' | 'medium' | 'hard'
  created_at TIMESTAMP
)

-- Evaluation runs
eval_runs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_ids JSON NOT NULL,  -- Array of provider IDs
  scenario_ids JSON NOT NULL,  -- Array of scenario IDs
  status TEXT DEFAULT 'pending',  -- 'pending' | 'running' | 'completed' | 'failed'
  progress REAL DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP
)

-- Individual evaluation results
eval_results (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES eval_runs,
  scenario_id TEXT REFERENCES scenarios,
  provider_id INTEGER REFERENCES providers,
  audio_url TEXT,
  transcript TEXT,
  ttfb INTEGER,  -- Time to first byte (ms)
  total_response_time INTEGER,
  wer REAL,  -- Word Error Rate (0-1)
  accuracy_score REAL,
  helpfulness_score REAL,
  naturalness_score REAL,
  efficiency_score REAL,
  judge_reasoning TEXT,
  task_completed BOOLEAN,
  created_at TIMESTAMP
)
```

## Data Flow

### Arena Match Flow

```
1. User selects category
   │
2. Frontend calls POST /api/arena/match
   │
3. Backend:
   ├── Select random prompt for category
   ├── Select two providers (weighted by match count)
   ├── Call both provider adapters (parallel)
   ├── Store responses to filesystem
   └── Create match record
   │
4. Return match with anonymous responses (A/B)
   │
5. User listens to both responses
   │
6. User votes (A/B/tie)
   │
7. Frontend calls POST /api/arena/vote
   │
8. Backend:
   ├── Validate match exists and not voted
   ├── Update Elo ratings (both providers)
   ├── Record vote
   └── Mark match completed
   │
9. Return Elo changes, reveal provider identities
```

### Evaluation Flow

```
1. User selects providers and scenarios
   │
2. Frontend calls POST /api/eval/runs
   │
3. Backend creates run record, starts execution (background)
   │
4. Eval Engine (for each scenario):
   │
   ├── Load scenario prompt
   │
   └── For each provider (parallel):
       ├── Create audio prompt
       ├── Call provider adapter
       ├── Measure latency (TTFB, total)
       ├── Save response audio
       ├── Transcribe (Whisper)
       ├── Calculate WER
       ├── Judge quality (LLM)
       └── Insert eval_result record
   │
5. Update run progress after each scenario
   │
6. Mark run completed
   │
7. Frontend polls GET /api/eval/runs/:id for status
   │
8. User views results with aggregated metrics
```

## State Management

### Client State (Zustand)

```typescript
// Arena store
interface ArenaState {
  category: Category;
  currentMatch: Match | null;
  isLoading: boolean;
  setCategory: (category: Category) => void;
  generateMatch: () => Promise<void>;
  submitVote: (winner: Winner) => Promise<VoteResult>;
}

// Eval store
interface EvalState {
  selectedProviders: string[];
  selectedScenarios: string[];
  toggleProvider: (id: string) => void;
  toggleScenario: (id: string) => void;
  createRun: () => Promise<string>;
}

// Settings store
interface SettingsState {
  providers: Provider[];
  loadProviders: () => Promise<void>;
  addProvider: (data: ProviderInput) => Promise<void>;
  deleteProvider: (id: number) => Promise<void>;
}
```

### Server State (SWR)

```typescript
// Cached data fetching with SWR
const { data: leaderboard } = useSWR('/api/arena/leaderboard');
const { data: providers } = useSWR('/api/providers');
const { data: scenarios } = useSWR('/api/scenarios');
const { data: runDetails } = useSWR(`/api/eval/runs/${runId}`);
```

## Folder Structure

```
voicebench-v2/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API route handlers
│   │   │   ├── arena/          # Arena endpoints
│   │   │   ├── eval/           # Evaluation endpoints
│   │   │   ├── providers/      # Provider endpoints
│   │   │   └── scenarios/      # Scenario endpoints
│   │   ├── arena/              # Arena page
│   │   ├── eval/               # Eval pages
│   │   │   ├── [id]/           # Run details
│   │   │   └── new/            # Create run
│   │   ├── leaderboard/        # Leaderboard page
│   │   ├── settings/           # Settings page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   │
│   ├── components/             # React components
│   │   ├── arena/              # Arena UI
│   │   ├── audio/              # Audio players
│   │   ├── charts/             # Visualizations
│   │   ├── eval/               # Eval UI
│   │   ├── layout/             # Navigation
│   │   ├── leaderboard/        # Rankings
│   │   ├── providers/          # Provider cards
│   │   ├── settings/           # Config forms
│   │   └── ui/                 # shadcn primitives
│   │
│   ├── db/                     # Database
│   │   ├── index.ts            # DB connection
│   │   └── schema/             # Drizzle schemas
│   │       ├── providers.ts
│   │       ├── ratings.ts
│   │       ├── prompts.ts
│   │       ├── matches.ts
│   │       ├── votes.ts
│   │       ├── scenarios.ts
│   │       ├── eval-runs.ts
│   │       └── eval-results.ts
│   │
│   ├── hooks/                  # Custom hooks
│   │   └── use-audio-player.ts
│   │
│   ├── lib/                    # Business logic
│   │   ├── eval/               # Evaluation engine
│   │   │   ├── eval-engine.ts
│   │   │   ├── judge-service.ts
│   │   │   ├── judge-prompts.ts
│   │   │   ├── whisper-service.ts
│   │   │   ├── wer-calculator.ts
│   │   │   ├── metrics-collector.ts
│   │   │   ├── scenario-parser.ts
│   │   │   └── scenario-schema.ts
│   │   ├── providers/          # Provider adapters
│   │   │   ├── base-adapter.ts
│   │   │   ├── openai-realtime-adapter.ts
│   │   │   ├── openai-realtime-types.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── services/           # Domain services
│   │   │   ├── arena-service.ts
│   │   │   ├── elo-service.ts
│   │   │   ├── matchmaking.ts
│   │   │   └── provider-service.ts
│   │   └── utils.ts            # Utilities
│   │
│   ├── stores/                 # Zustand stores
│   │   ├── arena-store.ts
│   │   ├── eval-store.ts
│   │   └── settings-store.ts
│   │
│   └── types/                  # TypeScript types
│       ├── eval-result.ts
│       ├── eval-run.ts
│       ├── match.ts
│       ├── prompt.ts
│       ├── provider.ts
│       ├── rating.ts
│       ├── scenario.ts
│       ├── scenario-yaml.ts
│       └── vote.ts
│
├── data/                       # SQLite database
│   └── voicebench.db
│
├── public/                     # Static files
│   └── audio/                  # Audio storage
│       ├── prompts/            # Prompt audio
│       └── evals/              # Eval responses
│
├── drizzle/                    # Migrations
│   └── meta/
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   ├── PROVIDERS.md
│   ├── SCENARIOS.md
│   └── API.md
│
├── drizzle.config.ts           # Drizzle config
├── next.config.ts              # Next.js config
├── package.json
├── tsconfig.json
└── README.md
```

## Security Considerations

### API Key Handling

- Provider API keys stored encrypted in database (config JSON)
- Keys never returned in API responses (masked with `***`)
- Keys only used server-side in provider adapters

### Rate Limiting

- Vote endpoint: 10 votes per minute per session
- Session ID derived from IP + User-Agent hash
- Rate limit headers returned in response

### Input Validation

- All endpoints use Zod schema validation
- YAML import validates against strict schema
- Provider types constrained to known values

## Performance

### Caching

- Leaderboard cached with 60s TTL (`Cache-Control: public, s-maxage=60`)
- SWR handles client-side caching and revalidation
- Static assets served from `/public`

### Background Processing

- Eval runs execute in background via `setImmediate`
- Progress updates persisted for polling
- Resumable: completed pairs skipped on restart

### Database

- SQLite for simplicity, sufficient for moderate load
- Indexes on foreign keys and common queries
- WAL mode for concurrent reads
