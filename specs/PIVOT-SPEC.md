# VoiceBench v3 — Voice AI Evaluation Workbench

## What Is It?
A developer tool for evaluating voice AI agents. Connect your providers, run live conversations, get real-time metrics (auto-detected + human-rated), and analyze results across models, prompts, and sessions.

## Pages

### 1. Providers (`/settings`)
**Already exists.** Add API keys for voice AI providers.
- OpenAI, Gemini, Retell AI, ElevenLabs, custom
- Test connection button
- Keep as-is, minor cleanup

### 2. Prompts (`/prompts`)
**New page.** Manage test prompts/scenarios.
- List of prompts with category tags
- Create/edit/delete prompts
- Each prompt has: text, category, expected outcome (optional), difficulty
- Import/export prompts (JSON/CSV)
- 75 scenarios already seeded — show them here

### 3. Live Eval (`/eval/live`)
**The core feature.** Pick a prompt + provider → start a live voice conversation.

#### Setup
- Select provider from dropdown
- Select prompt (or type freestyle)
- Hit "Start Session"

#### During Conversation
Split layout:
- **Left: Conversation** — real-time transcript with audio playback per turn
- **Right: Metrics Dashboard** — live-updating charts

**Auto-detected metrics (update automatically per turn):**
| Metric | How |
|--------|-----|
| Latency (TTFB) | Time from end of user speech to first agent audio byte |
| Total Response Time | Full round-trip |
| Turn-taking Latency | Gap between user stop → agent start |
| Word Error Rate | Compare STT transcript to expected (if available) |
| Response Length | Word count per turn |
| Speech Rate | Words per minute of agent response |
| Interruption Recovery | If user interrupts, does agent stop and adapt? (detect via overlap) |

**Human-rated metrics (quick buttons per turn):**
| Metric | Input |
|--------|-------|
| Naturalness | 👍/👎 — Does it sound human? |
| Prosody | 👍/👎 — Appropriate intonation, rhythm, stress? |
| Emotion | 👍/👎 — Appropriate emotional tone? |
| Accuracy | 👍/👎 — Correct information? |
| Helpfulness | 👍/👎 — Actually useful response? |
| Efficiency | 👍/👎 — Concise, not rambling? |
| Voice Consistency | 👍/👎 — Same character/voice throughout? |

Each turn shows a compact row of thumb buttons. One click per metric per turn. Fast.

#### End of Session
- Summary card with aggregate scores
- Auto-save to results database
- Option to add notes

### 4. Results (`/results`)
**Analysis page.** All eval sessions with comprehensive filtering.

#### Views
- **By Model** — Compare providers side-by-side across all metrics
- **By Prompt** — How does a specific prompt perform across models?
- **By Session** — Drill into individual eval sessions, turn-by-turn
- **By Metric** — Trend a specific metric across all sessions

#### Charts
- Bar charts for metric comparisons
- Radar chart for multi-metric provider comparison
- Time series for latency trends
- Distribution plots for score spreads

#### Export
- JSON, CSV export of all data
- Shareable session links

## Navigation
```
VoiceBench
  Eval (live eval page — the main feature)
  Results
  Prompts
  Settings (providers)
```

## What We Keep
- Provider management (Settings)
- Scenario/prompt database + seed data
- Drizzle ORM + SQLite
- shadcn/ui components
- Basic app shell

## What We Remove
- Arena (blind A/B polling)
- Leaderboard (Elo rankings)
- Old eval runs page
- Marketing homepage

## Tech Notes
- Real-time audio: WebSocket to provider API (OpenAI Realtime, Gemini Live)
- Transcript: Whisper or provider's built-in STT
- Charts: Recharts or Tremor (Tremor already installed)
- Human ratings stored per-turn in SQLite
- Auto-metrics computed server-side, pushed to client via SSE/WebSocket
