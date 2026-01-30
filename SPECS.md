# VoiceBench v2 - Technical Specifications

> Voice Agent Observatory + Arena
> "Chatbot Arena meets Hamming, but open source and for speech-to-speech."

---

## 1. Project Overview

### Name
**VoiceBench v2** - Voice Agent Evaluation Platform

### One-Line Description
An open-source platform for blind A/B comparison of speech-to-speech AI models with Elo rankings and automated evaluation metrics.

### Core Problem Being Solved
There's no standardized, open-source way to:
1. Compare voice AI providers head-to-head with crowd-sourced human preferences
2. Run automated evaluation suites against speech-to-speech models with consistent metrics
3. Track quality over time as providers update their models

### Target Users
- **AI Researchers** - Benchmarking new voice models against existing solutions
- **Product Teams** - Selecting voice AI providers for production use
- **Voice AI Providers** - Understanding competitive positioning
- **Developers** - Testing custom voice implementations
- **Enthusiasts** - Exploring and comparing voice AI capabilities

---

## 2. Functional Requirements

### 2.1 Arena Mode

#### FR-A01: Category Selection (P0)
- User can select from predefined scenario categories before starting a comparison
- Categories: `general`, `customer-support`, `information-retrieval`, `creative`, `multilingual`
- **Acceptance Criteria:**
  - Dropdown/button group showing all categories
  - Selection persists for the session
  - Default: `general`

#### FR-A02: Prompt Playback (P0)
- System plays an audio prompt that both providers will respond to
- Prompt is randomly selected from a pool for the chosen category
- **Acceptance Criteria:**
  - Audio player with play/pause controls
  - Visual waveform or progress indicator
  - Prompt text displayed (optional toggle)
  - Minimum 20 prompts per category at launch

#### FR-A03: Dual Response Generation (P0)
- System sends the same prompt to two randomly selected providers
- Responses are generated and cached before playback
- **Acceptance Criteria:**
  - Loading state while both responses generate
  - Timeout after 30 seconds per provider
  - Graceful handling if one provider fails (skip and re-pair)
  - Response audio stored temporarily for playback

#### FR-A04: Anonymous Response Playback (P0)
- User can play Response A and Response B
- Provider identity is hidden until after voting
- **Acceptance Criteria:**
  - Two distinct audio players labeled "A" and "B"
  - Randomized assignment (Provider X could be A or B)
  - Play count tracked (must play both at least once before voting)
  - Replay unlimited

#### FR-A05: Voting (P0)
- User votes: "A is better", "B is better", or "Tie"
- Vote is final and cannot be changed
- **Acceptance Criteria:**
  - Three buttons, disabled until both responses played
  - Confirmation toast on vote
  - Provider reveal after vote
  - Option to "Play Another" or view leaderboard

#### FR-A06: Elo Rating Calculation (P0)
- Votes update Elo ratings using Bradley-Terry model
- Ratings calculated per-category and overall
- **Acceptance Criteria:**
  - K-factor: 32 (standard)
  - Initial Elo: 1500
  - Tie counts as 0.5 win for each
  - Ratings update synchronously on vote

#### FR-A07: Public Leaderboard (P0)
- Display provider rankings with Elo scores
- Filter by category
- **Acceptance Criteria:**
  - Table with: Rank, Provider, Elo, Matches, Win Rate
  - Category filter dropdown
  - "All Categories" aggregate view
  - Sortable columns
  - Confidence intervals displayed (after N>30 matches)

#### FR-A08: Provider Randomization (P0)
- Matchups weighted to balance match counts
- Avoid same-provider comparisons
- **Acceptance Criteria:**
  - Providers with fewer matches get slight priority
  - Never match provider against itself
  - All active providers included in rotation

#### FR-A09: Match History (P1)
- Anonymous log of recent matches viewable publicly
- **Acceptance Criteria:**
  - Last 100 matches displayed
  - Shows: Category, Winner (A/B/Tie), Timestamp
  - No provider names until aggregate stats

#### FR-A10: Audio Prompt Contribution (P2)
- Users can submit new prompts for review
- **Acceptance Criteria:**
  - Upload form with category selection
  - Admin review queue (manual for v1)
  - Accepted prompts enter the pool

---

### 2.2 Eval Mode

#### FR-E01: Scenario Definition (P0)
- Define evaluation scenarios in YAML files
- **Acceptance Criteria:**
  - YAML schema validated on upload/creation
  - Required fields: `id`, `name`, `type`, `prompt`, `expected_outcome`
  - Optional: `tags`, `difficulty`, `language`
  - Support for audio file prompts or text-to-speech generation

#### FR-E02: Scenario Types (P0)
Support three scenario types:
- **task-completion**: Did the agent complete the requested task?
- **information-retrieval**: Did the agent provide accurate information?
- **conversation-flow**: Was the interaction natural and coherent?

**Acceptance Criteria:**
- Type-specific evaluation criteria in schema
- Different LLM-as-judge prompts per type

#### FR-E03: Eval Run Execution (P0)
- Execute a set of scenarios against one or more providers
- **Acceptance Criteria:**
  - Select scenarios (individual, by tag, or all)
  - Select providers to evaluate
  - Sequential execution with progress indicator
  - Resume capability if interrupted
  - Parallel provider calls per scenario

#### FR-E04: Automated Metrics (P0)
Calculate for each response:
- **TTFB (Time to First Byte)**: Latency until audio stream starts
- **Total Response Time**: End-to-end duration
- **WER (Word Error Rate)**: Via Whisper transcription vs. expected
- **Task Completion**: Binary (LLM-as-judge)

**Acceptance Criteria:**
- Metrics stored per response
- Aggregates computed: mean, median, p95, std dev
- WER requires Whisper integration (local or API)

#### FR-E05: LLM-as-Judge Scoring (P0)
- Score responses 1-10 on multiple dimensions
- **Acceptance Criteria:**
  - Dimensions: Accuracy, Helpfulness, Naturalness, Efficiency
  - Configurable judge model (default: GPT-4o)
  - Structured output with reasoning
  - Scores stored with justification text

#### FR-E06: Eval Run Reports (P0)
- Generate comprehensive reports for completed runs
- **Acceptance Criteria:**
  - Per-scenario breakdown with all metrics
  - Aggregate stats by provider
  - Comparison charts (bar, radar)
  - Export to JSON and CSV

#### FR-E07: Scenario Library (P1)
- Browse and manage saved scenarios
- **Acceptance Criteria:**
  - List view with filters (type, tags, language)
  - Import/export YAML bundles
  - Duplicate and edit scenarios
  - Delete with confirmation

#### FR-E08: Eval Templates (P1)
- Pre-built scenario sets for common use cases
- **Acceptance Criteria:**
  - "Customer Support Basics" (10 scenarios)
  - "General Knowledge" (15 scenarios)
  - "Multilingual Test" (5 scenarios × 4 languages)
  - One-click import

#### FR-E09: Historical Comparison (P2)
- Compare current run vs. previous runs
- **Acceptance Criteria:**
  - Select two runs to compare
  - Delta visualization (improved/regressed)
  - Trend charts for providers over time

---

### 2.3 Provider Management

#### FR-P01: Provider Configuration (P0)
- Configure API credentials and endpoints for each provider
- **Acceptance Criteria:**
  - Settings page with provider list
  - Per-provider: name, type, API key, endpoint URL
  - Secure storage (encrypted at rest for deployed version)
  - Test connection button

#### FR-P02: Provider Types (P0)
Support these provider integrations:
- **OpenAI Realtime API**: WebSocket streaming
- **Google Gemini Live API**: gRPC/REST streaming
- **ElevenLabs**: TTS API (text → speech only)
- **Custom WebSocket**: Generic WS endpoint

**Acceptance Criteria:**
- Adapter pattern for provider abstraction
- Type-specific configuration fields
- Health check endpoint per provider

#### FR-P03: Provider Enable/Disable (P0)
- Toggle providers in/out of Arena rotation
- **Acceptance Criteria:**
  - Active toggle on provider settings
  - Disabled providers excluded from matchmaking
  - Disabled providers still available for Eval runs

---

## 3. Technical Architecture

### 3.1 Tech Stack Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 14+ (App Router) | SSR, API routes, modern React patterns |
| **Language** | TypeScript | Type safety, better DX |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development, consistent design system |
| **Audio** | Web Audio API + MediaRecorder | Native browser audio handling, no external deps |
| **Charts** | Tremor | Built for dashboards, Tailwind-native |
| **Database** | SQLite (local) / Postgres (prod) | Simple local dev, scalable production |
| **ORM** | Drizzle | Type-safe, lightweight, good DX |
| **State** | Zustand | Minimal, TypeScript-first |
| **Audio Storage** | Local filesystem / S3 | Simple start, cloud-ready |

### 3.2 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  Pages/Components     │  Hooks              │  State (Zustand)  │
│  - Arena              │  - useAudioPlayer   │  - arenaStore     │
│  - Leaderboard        │  - useProviders     │  - evalStore      │
│  - EvalRuns           │  - useEloRating     │  - settingsStore  │
│  - Settings           │  - useEvalRun       │                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  /api/arena/*         │  /api/eval/*        │  /api/providers/* │
│  - POST /match        │  - POST /run        │  - GET /list      │
│  - POST /vote         │  - GET /runs        │  - POST /create   │
│  - GET /leaderboard   │  - GET /runs/:id    │  - PUT /:id       │
│  - GET /prompts       │  - POST /scenarios  │  - DELETE /:id    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ArenaService         │  EvalService        │  ProviderService  │
│  - generateMatch()    │  - executeRun()     │  - callProvider() │
│  - recordVote()       │  - scoreResponse()  │  - healthCheck()  │
│  - updateElo()        │  - generateReport() │                   │
├─────────────────────────────────────────────────────────────────┤
│  Provider Adapters                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐│
│  │ OpenAI       │ │ Gemini       │ │ ElevenLabs   │ │ Custom  ││
│  │ Realtime     │ │ Live         │ │ TTS          │ │ WS      ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer (Drizzle)                       │
├─────────────────────────────────────────────────────────────────┤
│  providers  │  matches  │  votes  │  scenarios  │  eval_runs    │
│  prompts    │  ratings  │  responses  │  metrics  │  settings   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              SQLite (local) / PostgreSQL (prod)                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Data Models

#### Provider
```typescript
interface Provider {
  id: string;                    // UUID
  name: string;                  // "OpenAI Realtime"
  type: ProviderType;            // "openai" | "gemini" | "elevenlabs" | "custom"
  config: ProviderConfig;        // Type-specific config (encrypted)
  isActive: boolean;             // Available for Arena
  createdAt: Date;
  updatedAt: Date;
}

type ProviderConfig = 
  | { type: "openai"; apiKey: string; model: string; }
  | { type: "gemini"; apiKey: string; model: string; }
  | { type: "elevenlabs"; apiKey: string; voiceId: string; }
  | { type: "custom"; wsUrl: string; headers?: Record<string, string>; };
```

#### Prompt
```typescript
interface Prompt {
  id: string;
  category: Category;            // "general" | "customer-support" | etc.
  text: string;                  // Prompt text
  audioUrl?: string;             // Pre-recorded audio (optional)
  language: string;              // ISO 639-1 code
  isActive: boolean;
  createdAt: Date;
}

type Category = 
  | "general" 
  | "customer-support" 
  | "information-retrieval" 
  | "creative" 
  | "multilingual";
```

#### Match (Arena)
```typescript
interface Match {
  id: string;
  promptId: string;
  category: Category;
  providerAId: string;
  providerBId: string;
  responseAUrl: string;          // Audio file URL
  responseBUrl: string;
  responseALatency: number;      // ms
  responseBLatency: number;
  createdAt: Date;
  votedAt?: Date;
  status: "pending" | "voted" | "expired";
}
```

#### Vote
```typescript
interface Vote {
  id: string;
  matchId: string;
  winner: "A" | "B" | "tie";
  sessionId: string;             // Anonymous session tracking
  createdAt: Date;
}
```

#### Rating
```typescript
interface Rating {
  id: string;
  providerId: string;
  category: Category | "overall";
  elo: number;                   // Current Elo rating
  matchCount: number;
  winCount: number;
  tieCount: number;
  updatedAt: Date;
}
```

#### Scenario (Eval)
```typescript
interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;            // "task-completion" | "information-retrieval" | "conversation-flow"
  prompt: string;
  promptAudioUrl?: string;
  expectedOutcome: string;       // Description for LLM-as-judge
  tags: string[];
  language: string;
  difficulty: "easy" | "medium" | "hard";
  createdAt: Date;
}
```

#### EvalRun
```typescript
interface EvalRun {
  id: string;
  name: string;
  providerIds: string[];
  scenarioIds: string[];
  status: "pending" | "running" | "completed" | "failed";
  progress: number;              // 0-100
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}
```

#### EvalResult
```typescript
interface EvalResult {
  id: string;
  runId: string;
  scenarioId: string;
  providerId: string;
  responseAudioUrl: string;
  responseTranscript: string;    // Whisper output
  
  // Automated metrics
  ttfb: number;                  // ms
  totalResponseTime: number;     // ms
  wer: number;                   // 0-1
  
  // LLM-as-judge scores (1-10)
  accuracyScore: number;
  helpfulnessScore: number;
  naturalnessScore: number;
  efficiencyScore: number;
  judgeReasoning: string;        // Full reasoning text
  
  taskCompleted: boolean;
  createdAt: Date;
}
```

### 3.4 API Contracts

#### Arena Endpoints

```typescript
// POST /api/arena/match
// Create a new match for voting
Request: {
  category: Category;
}
Response: {
  matchId: string;
  promptText: string;
  promptAudioUrl: string;
  responseA: { audioUrl: string; latency: number; };
  responseB: { audioUrl: string; latency: number; };
}

// POST /api/arena/vote
// Submit a vote for a match
Request: {
  matchId: string;
  winner: "A" | "B" | "tie";
}
Response: {
  success: boolean;
  providerA: { name: string; newElo: number; };
  providerB: { name: string; newElo: number; };
}

// GET /api/arena/leaderboard
// Get current rankings
Query: {
  category?: Category;  // Default: "overall"
}
Response: {
  rankings: Array<{
    rank: number;
    providerId: string;
    providerName: string;
    elo: number;
    matchCount: number;
    winRate: number;
    confidence: { lower: number; upper: number; } | null;
  }>;
}

// GET /api/arena/history
// Get recent match history
Query: {
  limit?: number;  // Default: 100
}
Response: {
  matches: Array<{
    id: string;
    category: Category;
    winner: "A" | "B" | "tie";
    createdAt: string;
  }>;
}
```

#### Eval Endpoints

```typescript
// POST /api/eval/runs
// Create and start an eval run
Request: {
  name: string;
  providerIds: string[];
  scenarioIds: string[];  // Or { tags: string[] } for tag-based selection
}
Response: {
  runId: string;
  status: "pending";
  totalScenarios: number;
}

// GET /api/eval/runs/:id
// Get run details and results
Response: {
  run: EvalRun;
  results: EvalResult[];
  aggregates: {
    byProvider: Record<string, {
      avgAccuracy: number;
      avgHelpfulness: number;
      avgNaturalness: number;
      avgEfficiency: number;
      avgTtfb: number;
      avgResponseTime: number;
      avgWer: number;
      taskCompletionRate: number;
    }>;
  };
}

// GET /api/eval/runs/:id/export
// Export results
Query: {
  format: "json" | "csv";
}
Response: File download

// POST /api/scenarios
// Create a new scenario
Request: Scenario (without id, createdAt)
Response: { id: string; }

// POST /api/scenarios/import
// Import scenarios from YAML
Request: {
  yaml: string;  // YAML content
}
Response: {
  imported: number;
  errors: Array<{ line: number; message: string; }>;
}
```

#### Provider Endpoints

```typescript
// GET /api/providers
Response: {
  providers: Array<Provider & { 
    ratings: Rating[];
    isHealthy: boolean;
  }>;
}

// POST /api/providers
Request: Omit<Provider, "id" | "createdAt" | "updatedAt">
Response: { id: string; }

// PUT /api/providers/:id
Request: Partial<Provider>
Response: { success: boolean; }

// POST /api/providers/:id/test
// Test provider connection
Response: {
  success: boolean;
  latency?: number;
  error?: string;
}
```

---

## 4. UI/UX Requirements

### 4.1 Key Screens

#### Home / Arena
- Hero section with tagline and "Start Comparing" CTA
- Category selector (pill buttons)
- Active match area:
  - Prompt player (waveform, play/pause)
  - Two response cards side-by-side
  - Each card: "Play" button, waveform visualization, duration
  - Vote buttons below (A wins / Tie / B wins)
- After vote: reveal providers, show Elo changes, "Next Match" button

#### Leaderboard
- Category tabs at top
- Data table with sortable columns
- Sparkline showing recent Elo trend (last 7 days)
- Click row to expand: recent matches, head-to-head records

#### Eval Runs
- List of all runs (name, status, date, provider count, scenario count)
- Status badges: Pending (gray), Running (blue pulse), Completed (green), Failed (red)
- "New Run" button → Run creation wizard
- Click row → Run Detail page

#### Run Detail
- Header: Run name, status, progress bar, duration
- Provider comparison chart (radar chart of avg scores)
- Results table: Scenario | Provider | Scores | Metrics | Actions
- Expand row: full response audio, transcript, judge reasoning
- Export button (JSON/CSV dropdown)

#### Scenario Library
- Grid/list toggle
- Filter sidebar: type, tags, language, difficulty
- Scenario cards: name, type badge, tag pills, preview of prompt
- Click → Scenario Detail modal/page
- Bulk actions: select multiple, delete, export

#### Settings
- Provider configuration accordion
- Each provider: connection form, test button, enable toggle
- Global settings: judge model selection, Whisper model selection
- Data management: export all data, reset database

### 4.2 User Flows

#### Arena Flow
```
1. Land on Home → See category selector
2. Select category → Click "Start Comparing"
3. Loading state → Prompt + 2 responses generated
4. Listen to prompt → Listen to Response A → Listen to Response B
5. Vote → See reveal animation, Elo changes
6. Choose: "Next Match" or "View Leaderboard"
```

#### Eval Run Flow
```
1. Navigate to Eval Runs → Click "New Run"
2. Step 1: Name the run, select providers (multi-select)
3. Step 2: Select scenarios (by individual, tag, or all)
4. Step 3: Review and confirm
5. Start run → See progress in real-time
6. Complete → View results, export
```

### 4.3 Design Principles

1. **Audio-First**: Audio players are prominent, not buried. Large play buttons, clear waveforms.

2. **Data-Dense**: Dashboard views pack information efficiently. Tables over cards for data.

3. **Progressive Disclosure**: Show summary first, details on demand (expand rows, modals).

4. **Keyboard-Friendly**: 
   - Arena: `1` = Play A, `2` = Play B, `←` = Vote A, `↓` = Tie, `→` = Vote B
   - Tables: Arrow navigation, Enter to expand

5. **Responsive**: 
   - Desktop: Side-by-side comparisons, multi-column tables
   - Tablet: Stacked cards, scrollable tables
   - Mobile: Full-width cards, simplified views

6. **Visual Hierarchy**:
   - Primary actions: Solid blue buttons
   - Secondary: Outline buttons
   - Destructive: Red, require confirmation

7. **State Communication**:
   - Loading: Skeleton screens, not spinners
   - Empty: Helpful empty states with CTAs
   - Errors: Inline errors, toast for system issues

### 4.4 Component Library (shadcn/ui)

Required components:
- Button, Card, Table, Tabs, Dialog, Select, Input
- Toast, Progress, Badge, Skeleton
- Accordion, Dropdown Menu, Command (for search)
- Form, Label, Checkbox, Radio Group

Custom components to build:
- `AudioPlayer` - Waveform visualization, play/pause, seek
- `EloChange` - Animated Elo delta display (+15 / -8)
- `ScoreRadar` - Radar chart for multi-dimension scores
- `ProviderCard` - Consistent provider display
- `CategoryPill` - Category selection buttons

---

## 5. Non-Functional Requirements

### 5.1 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Page Load (LCP)** | < 2.5s | Critical for initial engagement |
| **Arena Match Generation** | < 15s | Both responses ready |
| **Vote Submission** | < 500ms | Immediate feedback |
| **Eval Run Start** | < 2s | Begin execution |
| **Leaderboard Load** | < 1s | Cached aggressively |
| **Audio Playback Start** | < 200ms | After clicking play |

### 5.2 Security Considerations

1. **API Key Storage**
   - Encrypted at rest (AES-256)
   - Never exposed to frontend
   - Environment variables for local dev

2. **Rate Limiting**
   - Arena votes: 10/minute per session
   - API calls: 100/minute per IP
   - Eval runs: 5 concurrent per instance

3. **Input Validation**
   - Strict schema validation (Zod)
   - Sanitize YAML imports
   - File upload restrictions (audio only, max 10MB)

4. **Session Tracking**
   - Anonymous session IDs (no PII)
   - Used only for vote deduplication
   - 24-hour expiry

### 5.3 Scalability Needs

**v1 Targets (Local/Single Instance)**
- 1000 arena votes/day
- 10 concurrent eval runs
- 100 scenarios
- 10 providers

**Future Scaling Path**
- Postgres for multi-instance
- Redis for session/cache
- S3 for audio storage
- Queue system for eval jobs (BullMQ)

### 5.4 Reliability

- **Data Durability**: SQLite WAL mode, daily backups
- **Graceful Degradation**: If provider fails, skip and continue
- **Idempotency**: Votes, eval runs are idempotent by ID
- **Error Recovery**: Eval runs can resume from last completed scenario

---

## 6. Out of Scope (v1)

Explicitly NOT included in this version:

| Feature | Reason | Future Version |
|---------|--------|----------------|
| **User Authentication** | Complexity, not needed for anonymous voting | v2 |
| **Multi-turn Conversations** | Significantly more complex evaluation | v2 |
| **Real-time Streaming Viz** | Audio waveform during generation | v1.5 |
| **Custom Voice Cloning** | Provider-specific, out of scope | v3 |
| **Mobile App** | Web responsive is sufficient | v3 |
| **Self-hosted Whisper** | Start with OpenAI Whisper API | v1.5 |
| **Multiplayer Arena** | Real-time voting with others | v2 |
| **Provider Cost Tracking** | Track API spend per provider | v1.5 |
| **A/B Test Significance** | Statistical significance calculations | v1.5 |
| **WebRTC Audio Input** | User-provided prompts via mic | v2 |

---

## 7. YAML Schema Reference

### Scenario Schema

```yaml
# scenarios/customer-support.yaml
scenarios:
  - id: cs-001
    name: "Order Status Inquiry"
    type: task-completion
    prompt: "Hi, I placed an order yesterday and I want to know when it will arrive."
    expected_outcome: |
      Agent should:
      1. Acknowledge the order inquiry
      2. Ask for order number or identifying info
      3. Provide estimated delivery or next steps
    tags:
      - customer-support
      - orders
    language: en
    difficulty: easy

  - id: cs-002
    name: "Refund Request"
    type: task-completion
    prompt: "I received a broken item and I want my money back."
    expected_outcome: |
      Agent should:
      1. Express empathy about the broken item
      2. Offer refund or replacement options
      3. Explain the process clearly
    tags:
      - customer-support
      - refunds
    language: en
    difficulty: medium
```

### Provider Configuration Schema

```yaml
# config/providers.yaml
providers:
  - name: "OpenAI Realtime"
    type: openai
    config:
      model: "gpt-4o-realtime-preview"
    active: true

  - name: "Gemini Live"
    type: gemini
    config:
      model: "gemini-2.0-flash-live"
    active: true

  - name: "ElevenLabs TTS"
    type: elevenlabs
    config:
      voice_id: "21m00Tcm4TlvDq8ikWAM"
      model_id: "eleven_turbo_v2"
    active: true

  - name: "Custom Voice Bot"
    type: custom
    config:
      ws_url: "wss://my-voice-bot.example.com/ws"
      headers:
        Authorization: "Bearer ${CUSTOM_API_KEY}"
    active: false
```

---

## 8. Implementation Milestones

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Next.js, Tailwind, shadcn/ui, Drizzle)
- [ ] Database schema and migrations
- [ ] Provider adapter interface and OpenAI implementation
- [ ] Basic audio player component

### Phase 2: Arena Core (Week 3-4)
- [ ] Arena page UI
- [ ] Match generation flow
- [ ] Voting and Elo calculation
- [ ] Leaderboard display

### Phase 3: Eval Core (Week 5-6)
- [ ] Scenario YAML parser
- [ ] Eval run execution engine
- [ ] Whisper integration for WER
- [ ] LLM-as-judge integration

### Phase 4: Polish (Week 7-8)
- [ ] Settings page
- [ ] Export functionality
- [ ] Additional provider adapters (Gemini, ElevenLabs)
- [ ] Documentation and README

---

## 9. Open Questions

1. **Whisper Integration**: Self-hosted vs. OpenAI API? (Recommend: Start with API, add self-hosted later)

2. **Audio Storage**: Local filesystem for v1, but need strategy for production. S3-compatible?

3. **LLM-as-Judge Model**: GPT-4o default, but should we support Claude as alternative?

4. **Prompt Pool**: How to seed initial prompts? Synthetic generation or manual curation?

5. **Provider Authentication**: Some providers (OpenAI Realtime) require WebSocket auth. Architecture for secure client-side streaming?

---

*Specifications v1.0 — Generated for VoiceBench v2*
