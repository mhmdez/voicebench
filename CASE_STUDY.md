# VoiceBench: Building the Missing Evaluation Layer for Voice AI

**A product case study by [Mo](https://github.com/mhmdez)**

---

## The Problem

Voice AI is a $6B+ market growing at 15% a year. Every major lab has a speech-to-speech offering now—OpenAI's Realtime API, Google's Gemini Live, ElevenLabs Conversational AI, Retell, Bland, Vapi, the list keeps growing. And every single one of them claims to be the best.

Here's what actually happens when a product team needs to pick a voice AI provider: someone runs three demos in a conference room, the CEO likes the one that sounds most like Scarlett Johansson, and they sign a contract. That's it. That's the evaluation process.

Text LLMs solved this years ago. LMSYS Chatbot Arena gives you blind comparisons with crowd-sourced Elo rankings. MMLU, HumanEval, MT-Bench—there's a whole ecosystem of standardized benchmarks. When someone claims GPT-4 beats Claude on reasoning, you can actually check.

Voice AI has none of this. Zero. The closest thing is a provider's own cherry-picked demos. We're making million-dollar infrastructure decisions based on vibes.

The gap is even more absurd when you consider that voice evaluation is *harder* than text evaluation. Latency matters in ways it doesn't for text—200ms feels instant, 800ms feels broken. Naturalness is deeply subjective and context-dependent. You can't just read a transcript and call it evaluated; the same words spoken robotically versus naturally are entirely different products.

## The Insight

I kept coming back to one question: what made Chatbot Arena work?

It wasn't the technology. It was the design decisions:

1. **Blind comparisons** eliminate brand bias. People rate what they hear, not what they expect.
2. **Crowd-sourced preferences** capture the subjective reality that no automated metric can. Human preference *is* the ground truth for conversational quality.
3. **Elo rankings** give you a single, statistically grounded number to compare. Not a marketing slide—a number derived from thousands of real comparisons.

The insight was: apply this exact pattern to voice AI, but respect the ways audio is fundamentally different from text.

You can't just swap in audio files and call it done. Voice evaluation needs to account for:

- **Latency as a first-class metric.** A brilliant response that takes 3 seconds to start is worse than a good response that starts in 300ms. In voice, speed *is* quality.
- **Naturalness that can't be read.** Transcript accuracy (WER) tells you what was said, not how it sounded. You need human ears.
- **Context-dependent quality.** A voice that works for a customer support bot sounds wrong for a creative writing assistant. One Elo ranking isn't enough—you need per-category rankings.
- **The playback problem.** Unlike text, where you can see both responses simultaneously, audio is sequential. Your comparison UX has to account for recency bias and listening fatigue.

## The Solution

VoiceBench is an open-source voice AI evaluation platform with two complementary modes:

### Arena Mode

Blind A/B comparison. The system picks two providers randomly, sends the same prompt to both, and plays back the responses as "Response A" and "Response B." You listen, you vote, the Elo ratings update. Provider identity is revealed only after you've committed your vote.

The matchmaking algorithm balances match counts across providers so rankings converge efficiently. Categories let you filter—because the best customer support voice is probably not the best creative storytelling voice.

### Evaluation Framework

Automated benchmarks for when you need scale. 75+ scenarios across five categories (general knowledge, customer support, creative, multilingual, conversation flow). Each scenario runs through every configured provider and measures:

- **LLM-as-judge scoring** on four dimensions: accuracy, helpfulness, naturalness, and efficiency (1-10 each)
- **Word Error Rate (WER)** via Whisper transcription against expected outcomes
- **Latency metrics** (time to first byte, total response time)
- **Task completion** (binary: did the model actually do what was asked?)

The judge prompts are scenario-type-specific. A task completion scenario ("Set a timer for 5 minutes") is evaluated differently than an information retrieval scenario ("What's the capital of Japan?") or a conversation flow scenario ("Follow up on what we discussed earlier"). One rubric doesn't fit all.

### Elo Leaderboard

Statistical rankings with confidence intervals. Bradley-Terry model, K-factor of 32, starting Elo of 1500. Per-category and aggregate views. Sortable by Elo, match count, win rate. Confidence intervals displayed after 30+ matches per provider—because a ranking based on 5 votes is noise, not signal.

### Multi-Provider Architecture

Ships with adapters for OpenAI Realtime API, Google Gemini, Retell AI, and ElevenLabs. Adding a new provider means implementing one abstract class with two methods: `generateResponse()` and `healthCheck()`. The adapter pattern handles retries, timeouts, and error normalization so the evaluation layer doesn't care who's underneath.

## Product Decisions

Every feature is a decision. Here are the ones that mattered most, and why.

### Open source first

Trust is the product. An evaluation platform that isn't open source is just another vendor's marketing tool. If you can't read the code that generates the rankings, the rankings are meaningless.

Open source also solves distribution. I don't need to sell anyone on VoiceBench—they can clone it, run it, and decide for themselves. Community contributions add providers and scenarios faster than any team could.

### Local-first with SQLite

`npm install && npm run dev` and you're evaluating voice models. No Postgres to provision, no Redis, no Docker compose file with 6 services. SQLite via better-sqlite3, managed by Drizzle ORM.

This was a deliberate bet on adoption speed over scale. A tool that requires 30 minutes of infrastructure setup doesn't get used. A tool that works in 60 seconds does. And for the actual use case—running evaluations on a few dozen providers with a few thousand votes—SQLite is more than sufficient.

The migration path to Postgres is trivial if scale demands it. Drizzle abstracts the dialect. But premature infrastructure is the #1 killer of developer tools.

### Provider-agnostic adapter pattern

The `ProviderAdapter` base class defines the contract: take an audio prompt in, return an audio response with latency metrics out. Everything else—authentication, API format, streaming behavior, error codes—is the adapter's problem.

This matters because voice AI providers have wildly different APIs. OpenAI uses WebSocket-based realtime sessions. Gemini uses REST with server-sent events. Retell wraps a phone-call abstraction. ElevenLabs has yet another pattern. Without a clean adapter boundary, the evaluation engine would be a mess of provider-specific conditionals.

New providers get added without touching the evaluation logic. That's the point.

### Category-based evaluation

A single quality score for a voice AI provider is almost useless. Gemini might crush customer support scenarios with fast, concise answers but stumble on creative tasks that need personality. OpenAI might excel at natural conversation but have higher latency.

VoiceBench evaluates across five categories: general knowledge, customer support, creative, multilingual, and conversation flow. Each category has its own scenario pool, its own Elo ratings, and its own judge rubric.

This mirrors how products actually use voice AI. Nobody deploys one model for everything. You want to know: *which model is best for my use case?*

### Keyboard shortcuts for rapid voting

Arrow left picks A. Arrow right picks B. Arrow down is a tie. Small detail. Big impact on throughput.

Arena-style evaluation lives or dies on vote volume. If voting feels tedious, people stop after 10 comparisons and your rankings are useless. Keyboard shortcuts let evaluators flow through comparisons without breaking rhythm. In testing, it roughly doubled the votes-per-session rate.

### Elo with confidence intervals

Elo is a well-understood system. It's been used in chess for decades, it powered Chatbot Arena's rise, and people intuitively understand "higher number = better." But raw Elo without confidence intervals is misleading—a 1520 rating from 8 matches isn't meaningfully different from a 1480 rating from 6 matches.

VoiceBench displays confidence intervals after 30+ matches. Below that threshold, the ranking shows the Elo but signals that it's preliminary. This is a small statistical courtesy that prevents people from making bad decisions based on noisy data.

## Technical Architecture

The stack is intentionally boring:

- **Next.js 16** with App Router — server components for data-heavy pages, client components for interactive arena UI
- **TypeScript** everywhere — the provider adapter interface is the source of truth
- **Drizzle ORM + SQLite** — type-safe database access with zero infrastructure
- **shadcn/ui + Tailwind CSS 4** — consistent, accessible component library
- **Zustand** for client state — arena session, evaluation progress, settings

The schema has 8 tables: providers, scenarios, prompts, matches, votes, ratings, eval_runs, and eval_results. Ratings are stored per provider per category. Eval results capture all four judge dimensions plus WER, latency, and task completion.

The eval engine orchestrates scenario execution: parse YAML scenarios → fan out to configured providers → collect responses and latency → transcribe via Whisper → calculate WER → send to LLM judge → aggregate scores → store results. Each eval run is idempotent and exportable.

Scenario definitions are YAML files in `data/scenarios/`. Adding a new evaluation scenario is a 5-line YAML block—no code changes required. There are currently 75+ scenarios spanning five categories, designed to stress-test different aspects of voice AI quality.

## What I'd Build Next

VoiceBench as it exists is a local tool. Useful, but constrained. Here's where I'd take it with resources:

**Hosted community leaderboard.** The real power of Chatbot Arena is aggregate crowd wisdom. A hosted VoiceBench where anyone can vote would produce rankings that actually mean something to the industry. This is the obvious next step—it's also the hardest, because you need to serve audio at scale while keeping provider costs manageable.

**Real-time voice comparison.** Currently, VoiceBench compares pre-generated responses. The next level is live microphone input—speak a prompt, hear both models respond in real-time, vote on the fly. This captures the latency experience in a way that pre-recorded playback can't fully replicate.

**CI/CD integration.** Voice AI quality should be a gate in the deployment pipeline, not a quarterly manual review. An API that lets you run VoiceBench scenarios as part of CI—"fail the build if customer support WER regresses more than 5%"—would make voice quality engineering a real discipline.

**Automated regression testing.** Providers update their models constantly. A scheduled eval run that compares this week's scores to last week's and alerts on regressions would be invaluable for teams that depend on third-party voice APIs.

**Expanded provider support.** Retell, Bland, Vapi, LiveKit, Deepgram, PlayHT, LMNT—the voice AI ecosystem is fragmented. The adapter pattern makes adding providers mechanical, but each one still needs implementation and testing. A community contribution model (submit a PR with your adapter) is the scalable path.

## Lessons Learned

**Voice evaluation is a product problem, not a technology problem.** The hard part isn't building the audio pipeline or the Elo calculator. It's designing an evaluation framework that people actually trust and use. That means blind comparisons (not side-by-side with labels), per-category rankings (not one number), and confidence intervals (not false precision). The product decisions *are* the product.

**Latency is quality.** In text, you can get away with a slow model if the output is good enough. In voice, you can't. A 2-second pause before a response is a broken product regardless of what comes after. Any voice evaluation that doesn't measure and weight latency is missing the most important dimension.

**Subjectivity is a feature, not a bug.** The LLM judge gives you scalable, consistent scores. But human preference votes capture something the judge can't—the gestalt of "does this voice *feel* right?" Both signals matter. The Arena captures preference; the eval framework captures metrics. Together, they give you a complete picture.

**The adapter pattern is worth the upfront cost.** I spent significant time designing the provider abstraction before writing a single adapter. Every provider that's been added since took a fraction of that time. In a fast-moving market where new voice APIs launch monthly, the ability to add a provider in an afternoon is a competitive advantage for the platform.

**SQLite is underrated for developer tools.** The number of useful tools that never get adopted because they require a database server is staggering. SQLite eliminated the most common reason people don't try things: setup friction. Every minute of infrastructure setup you remove is a multiplicative improvement in adoption.

**Context matters more than benchmarks.** A model's aggregate score tells you almost nothing about whether it'll work for your specific application. The category system exists because I watched teams pick providers based on general benchmarks and then wonder why they performed poorly on customer support calls. Evaluation without context is misleading evaluation.

---

*VoiceBench is open source under the MIT license. [View the code on GitHub.](https://github.com/mhmdez/voicebench)*
