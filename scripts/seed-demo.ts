/**
 * Demo Seed Script
 *
 * Seeds the database with realistic demo data:
 * - 5 providers with fake API keys
 * - 60+ arena matches with realistic vote distributions
 * - Elo ratings reflecting match outcomes
 * - 3 evaluation runs with results
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const DB_PATH = process.env.DATABASE_URL || './data/voicebench.db';
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

// ─── Providers ───────────────────────────────────────────────────────
const PROVIDERS = [
  {
    name: 'OpenAI GPT-4o Realtime',
    type: 'openai',
    config: JSON.stringify({
      apiKey: 'sk-demo-openai-xxxxxxxxxxxxxxxxxxxx',
      model: 'gpt-4o-realtime-preview',
      voice: 'alloy',
    }),
  },
  {
    name: 'Gemini 2.0 Flash',
    type: 'gemini',
    config: JSON.stringify({
      apiKey: 'AIzaSy-demo-gemini-xxxxxxxxxxxxxxxxx',
      model: 'gemini-2.0-flash',
    }),
  },
  {
    name: 'ElevenLabs Conversational AI',
    type: 'elevenlabs',
    config: JSON.stringify({
      apiKey: 'el-demo-xxxxxxxxxxxxxxxxxxxxxxxxxx',
      agentId: 'agent_demo_elevenlabs',
      voiceId: 'pNInz6obpgDQGcFmaJgB',
    }),
  },
  {
    name: 'Retell AI',
    type: 'retell',
    config: JSON.stringify({
      apiKey: 'retell-demo-xxxxxxxxxxxxxxxxxxxxxxx',
      agentId: 'agent_demo_retell',
    }),
  },
  {
    name: 'Bland AI',
    type: 'custom',
    config: JSON.stringify({
      apiKey: 'bland-demo-xxxxxxxxxxxxxxxxxxxxxxx',
      endpoint: 'https://api.bland.ai/v1/calls',
      model: 'bland-turbo',
    }),
  },
];

// ─── Insert Providers ────────────────────────────────────────────────
console.log('🔧 Inserting providers...');

const insertProvider = sqlite.prepare(`
  INSERT INTO providers (name, type, config, is_active, created_at, updated_at)
  VALUES (?, ?, ?, 1, unixepoch() - ?, unixepoch())
`);

const providerIds: number[] = [];
for (let i = 0; i < PROVIDERS.length; i++) {
  const p = PROVIDERS[i];
  // Stagger creation dates (older providers first)
  const ageSeconds = (PROVIDERS.length - i) * 86400 * 3; // 3 days apart
  const result = insertProvider.run(p.name, p.type, p.config, ageSeconds);
  providerIds.push(Number(result.lastInsertRowid));
  console.log(`  ✓ ${p.name} (id: ${result.lastInsertRowid})`);
}

// ─── Fetch existing prompts ──────────────────────────────────────────
const allPrompts = sqlite.prepare('SELECT id, category, text FROM prompts WHERE is_active = 1').all() as Array<{
  id: string;
  category: string;
  text: string;
}>;

console.log(`\n📝 Found ${allPrompts.length} active prompts`);

if (allPrompts.length === 0) {
  console.error('❌ No prompts found in DB. Run db:seed first.');
  process.exit(1);
}

// ─── Provider strength profiles (for realistic Elo) ──────────────────
// Higher = more likely to win. OpenAI strongest, Bland weakest.
const providerStrength: Record<number, number> = {};
const strengths = [0.72, 0.65, 0.60, 0.52, 0.45]; // win probabilities vs average
providerIds.forEach((id, i) => {
  providerStrength[id] = strengths[i];
});

// ─── Generate Matches & Votes ────────────────────────────────────────
console.log('\n⚔️  Generating arena matches...');

const insertMatch = sqlite.prepare(`
  INSERT INTO matches (id, prompt_id, category, provider_a_id, provider_b_id,
    response_a_url, response_b_url, response_a_latency, response_b_latency,
    created_at, voted_at, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
`);

const insertVote = sqlite.prepare(`
  INSERT INTO votes (id, match_id, winner, session_id, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

// Elo tracking
const elo: Record<string, Record<number, { rating: number; matches: number; wins: number; ties: number }>> = {};
const categories = ['general', 'customer-support', 'information-retrieval', 'creative', 'multilingual'];

for (const cat of categories) {
  elo[cat] = {};
  for (const pid of providerIds) {
    elo[cat][pid] = { rating: 1500, matches: 0, wins: 0, ties: 0 };
  }
}

function updateElo(
  cat: string,
  winnerId: number,
  loserId: number,
  isTie: boolean
) {
  const K = 32;
  const w = elo[cat][winnerId];
  const l = elo[cat][loserId];

  const expectedW = 1 / (1 + Math.pow(10, (l.rating - w.rating) / 400));
  const expectedL = 1 - expectedW;

  if (isTie) {
    w.rating = Math.round(w.rating + K * (0.5 - expectedW));
    l.rating = Math.round(l.rating + K * (0.5 - expectedL));
    w.ties++;
    l.ties++;
  } else {
    w.rating = Math.round(w.rating + K * (1 - expectedW));
    l.rating = Math.round(l.rating + K * (0 - expectedL));
    w.wins++;
  }
  w.matches++;
  l.matches++;
}

const NUM_MATCHES = 80;
let matchCount = 0;

// Spread matches over the last 14 days
const now = Math.floor(Date.now() / 1000);
const fourteenDaysAgo = now - 14 * 86400;

// Generate fake session IDs (simulating ~20 unique users)
const sessionIds = Array.from({ length: 20 }, () => randomUUID());

const matchTransaction = sqlite.transaction(() => {
  for (let i = 0; i < NUM_MATCHES; i++) {
    // Pick two different providers
    const shuffled = [...providerIds].sort(() => Math.random() - 0.5);
    const providerAId = shuffled[0];
    const providerBId = shuffled[1];

    // Pick a random prompt
    const prompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];

    // Generate realistic latencies (ms)
    const latencyA = 600 + Math.random() * 1200; // 600-1800ms
    const latencyB = 600 + Math.random() * 1200;

    // Determine winner based on provider strength
    const strengthA = providerStrength[providerAId];
    const strengthB = providerStrength[providerBId];
    const pAWins = strengthA / (strengthA + strengthB);

    const roll = Math.random();
    let winner: 'A' | 'B' | 'tie';
    if (roll < 0.08) {
      // 8% tie rate
      winner = 'tie';
    } else if (roll < 0.08 + pAWins * 0.92) {
      winner = 'A';
    } else {
      winner = 'B';
    }

    const matchId = randomUUID();
    const createdAtUnix = fourteenDaysAgo + Math.floor(Math.random() * (now - fourteenDaysAgo));
    const votedAtUnix = createdAtUnix + Math.floor(Math.random() * 120) + 10; // 10-130s after

    const createdAt = new Date(createdAtUnix * 1000);
    const votedAt = new Date(votedAtUnix * 1000);

    insertMatch.run(
      matchId,
      prompt.id,
      prompt.category,
      String(providerAId),
      String(providerBId),
      `/audio/mock/demo-response-a.mp3`,
      `/audio/mock/demo-response-b.mp3`,
      Math.round(latencyA),
      Math.round(latencyB),
      Math.floor(createdAt.getTime() / 1000),
      Math.floor(votedAt.getTime() / 1000)
    );

    const sessionId = sessionIds[Math.floor(Math.random() * sessionIds.length)];
    insertVote.run(
      randomUUID(),
      matchId,
      winner,
      sessionId,
      Math.floor(votedAt.getTime() / 1000)
    );

    // Update Elo
    if (winner === 'tie') {
      updateElo(prompt.category, providerAId, providerBId, true);
    } else if (winner === 'A') {
      updateElo(prompt.category, providerAId, providerBId, false);
    } else {
      updateElo(prompt.category, providerBId, providerAId, false);
    }

    matchCount++;
  }
});

matchTransaction();
console.log(`  ✓ Created ${matchCount} matches with votes`);

// ─── Insert Elo Ratings ──────────────────────────────────────────────
console.log('\n📊 Setting Elo ratings...');

const insertRating = sqlite.prepare(`
  INSERT INTO ratings (provider_id, category, elo, match_count, win_count, tie_count, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, unixepoch())
`);

const ratingTransaction = sqlite.transaction(() => {
  for (const cat of categories) {
    for (const pid of providerIds) {
      const r = elo[cat][pid];
      if (r.matches > 0) {
        insertRating.run(pid, cat, r.rating, r.matches, r.wins, r.ties);
        console.log(
          `  ${PROVIDERS[providerIds.indexOf(pid)].name} [${cat}]: ${r.rating} (${r.wins}W/${r.ties}T/${r.matches}M)`
        );
      }
    }
  }
});

ratingTransaction();

// ─── Seed Eval Runs ──────────────────────────────────────────────────
console.log('\n🧪 Seeding evaluation runs...');

const allScenarios = sqlite.prepare('SELECT id, name, type, prompt FROM scenarios').all() as Array<{
  id: string;
  name: string;
  type: string;
  prompt: string;
}>;

console.log(`  Found ${allScenarios.length} scenarios`);

const insertEvalRun = sqlite.prepare(`
  INSERT INTO eval_runs (id, name, provider_ids, scenario_ids, status, progress, started_at, completed_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertEvalResult = sqlite.prepare(`
  INSERT INTO eval_results (id, run_id, scenario_id, provider_id, audio_url, transcript,
    ttfb, total_response_time, wer, accuracy_score, helpfulness_score, naturalness_score,
    efficiency_score, judge_reasoning, task_completed, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Eval run configs
const evalRunConfigs = [
  {
    name: 'Full Benchmark - All Providers',
    providerIds: providerIds.slice(0, 4).map(String),
    scenarioSlice: [0, 25], // First 25 scenarios
    daysAgo: 7,
  },
  {
    name: 'Task Completion Deep Dive',
    providerIds: providerIds.slice(0, 3).map(String),
    scenarioSlice: [0, 15], // First 15 scenarios (task-completion heavy)
    daysAgo: 3,
  },
  {
    name: 'Latest Provider Comparison',
    providerIds: [providerIds[0], providerIds[1], providerIds[4]].map(String),
    scenarioSlice: [25, 50], // Middle scenarios
    daysAgo: 1,
  },
];

// Baseline scores per provider (index matches PROVIDERS array)
const providerBaselines = [
  { accuracy: 88, helpfulness: 85, naturalness: 82, efficiency: 90 }, // OpenAI
  { accuracy: 82, helpfulness: 80, naturalness: 78, efficiency: 88 }, // Gemini
  { accuracy: 76, helpfulness: 74, naturalness: 92, efficiency: 72 }, // ElevenLabs (great naturalness)
  { accuracy: 72, helpfulness: 70, naturalness: 75, efficiency: 68 }, // Retell
  { accuracy: 65, helpfulness: 62, naturalness: 68, efficiency: 60 }, // Bland
];

// Sample transcripts for different scenario types
const sampleTranscripts: Record<string, string[]> = {
  'task-completion': [
    "Sure, I've set your alarm for 7:30 AM tomorrow. You'll hear it first thing in the morning.",
    "Done! I've created a calendar event for next Tuesday at 2 PM with John. Would you like me to send him an invite?",
    "I've sent the message to Mom: 'I'll be home for dinner.' Is there anything else you'd like me to help with?",
    "150 pounds is approximately 68.04 kilograms. Would you like to convert anything else?",
    "Your 25-minute Pomodoro timer is set and running. I'll let you know when it's time for a break.",
  ],
  'information-retrieval': [
    "The Eiffel Tower was completed on March 31, 1889, and stands at 330 meters tall including its antenna.",
    "Water boils at 100 degrees Celsius or 212 degrees Fahrenheit at standard atmospheric pressure.",
    "The human body has 206 bones in the adult skeleton. Babies are born with about 270 soft bones.",
    "The speed of light in a vacuum is approximately 299,792,458 meters per second.",
    "Python was created by Guido van Rossum and first released in 1991.",
  ],
  'conversation-flow': [
    "I completely understand how frustrating that must be. Let me look into your order right away and see what we can do to make this right.",
    "That's a great question! Based on what you've told me, I'd recommend starting with option A since it aligns better with your goals.",
    "I appreciate you sharing that with me. It sounds like you've been thinking about this a lot. What matters most to you in this decision?",
    "Absolutely, I can help with that! Let me walk you through the process step by step so it's as smooth as possible.",
    "That's really interesting! I hadn't thought about it from that angle before. Could you tell me more about what led you to that conclusion?",
  ],
};

const evalTransaction = sqlite.transaction(() => {
  for (const config of evalRunConfigs) {
    const runId = randomUUID();
    const scenarioSubset = allScenarios.slice(config.scenarioSlice[0], config.scenarioSlice[1]);
    const scenarioIdsForRun = scenarioSubset.map((s) => s.id);

    const startedAt = Math.floor(Date.now() / 1000) - config.daysAgo * 86400;
    const completedAt = startedAt + 600 + Math.floor(Math.random() * 1800); // 10-40 min
    const createdAt = startedAt - 60;

    insertEvalRun.run(
      runId,
      config.name,
      JSON.stringify(config.providerIds),
      JSON.stringify(scenarioIdsForRun),
      'completed',
      100,
      startedAt,
      completedAt,
      createdAt
    );

    console.log(`  ✓ Run: "${config.name}" (${config.providerIds.length} providers × ${scenarioSubset.length} scenarios)`);

    // Generate results for each provider × scenario combination
    let resultCount = 0;
    for (const providerId of config.providerIds) {
      const providerIndex = providerIds.indexOf(Number(providerId));
      const baseline = providerBaselines[providerIndex] || providerBaselines[4];

      for (const scenario of scenarioSubset) {
        const resultId = randomUUID();

        // Add variance to scores (±10)
        const jitter = () => Math.round((Math.random() - 0.5) * 20);
        const clamp = (v: number) => Math.max(0, Math.min(100, v));

        const accuracyScore = clamp(baseline.accuracy + jitter());
        const helpfulnessScore = clamp(baseline.helpfulness + jitter());
        const naturalnessScore = clamp(baseline.naturalness + jitter());
        const efficiencyScore = clamp(baseline.efficiency + jitter());

        // WER (lower is better) — inversely correlated with accuracy
        const wer = Math.max(0, Math.min(1, (100 - accuracyScore) / 200 + Math.random() * 0.05));

        // Latency metrics
        const ttfb = 200 + Math.random() * 800; // 200-1000ms
        const totalResponseTime = ttfb + 500 + Math.random() * 2000; // additional 500-2500ms

        // Pick a transcript
        const transcriptPool = sampleTranscripts[scenario.type] || sampleTranscripts['conversation-flow'];
        const transcript = transcriptPool[Math.floor(Math.random() * transcriptPool.length)];

        // Task completion (correlated with accuracy)
        const taskCompleted = accuracyScore > 60 ? (Math.random() > 0.15 ? 1 : 0) : (Math.random() > 0.6 ? 1 : 0);

        // Judge reasoning
        const providerName = PROVIDERS[providerIndex]?.name || 'Provider';
        const reasons = [
          `${providerName} provided a ${accuracyScore > 80 ? 'highly accurate' : accuracyScore > 60 ? 'reasonably accurate' : 'partially accurate'} response. ${naturalnessScore > 80 ? 'The voice quality was natural and engaging.' : 'Voice quality could be improved.'} Response time of ${Math.round(totalResponseTime)}ms is ${totalResponseTime < 1500 ? 'excellent' : totalResponseTime < 2500 ? 'acceptable' : 'slower than ideal'}.`,
          `The response ${taskCompleted ? 'successfully completed' : 'partially addressed'} the task. ${helpfulnessScore > 75 ? 'Good contextual understanding.' : 'Some context was missed.'} WER of ${(wer * 100).toFixed(1)}% indicates ${wer < 0.05 ? 'excellent' : wer < 0.1 ? 'good' : 'moderate'} transcription accuracy.`,
        ];
        const judgeReasoning = reasons[Math.floor(Math.random() * reasons.length)];

        const resultCreatedAt = startedAt + Math.floor((completedAt - startedAt) * Math.random());

        insertEvalResult.run(
          resultId,
          runId,
          scenario.id,
          providerId,
          `/audio/mock/demo-response-a.mp3`,
          transcript,
          Math.round(ttfb),
          Math.round(totalResponseTime),
          parseFloat(wer.toFixed(4)),
          accuracyScore,
          helpfulnessScore,
          naturalnessScore,
          efficiencyScore,
          judgeReasoning,
          taskCompleted,
          resultCreatedAt
        );
        resultCount++;
      }
    }
    console.log(`    → ${resultCount} eval results`);
  }
});

evalTransaction();

// ─── Summary ─────────────────────────────────────────────────────────
console.log('\n✅ Demo seed complete!');
console.log(`   Providers: ${PROVIDERS.length}`);
console.log(`   Matches: ${matchCount}`);
console.log(`   Eval Runs: ${evalRunConfigs.length}`);

const totalResults = sqlite.prepare('SELECT COUNT(*) as cnt FROM eval_results').get() as { cnt: number };
console.log(`   Eval Results: ${totalResults.cnt}`);

const topRatings = sqlite
  .prepare(
    `SELECT p.name, r.category, r.elo, r.match_count, r.win_count
     FROM ratings r JOIN providers p ON r.provider_id = p.id
     ORDER BY r.elo DESC LIMIT 10`
  )
  .all() as Array<{ name: string; category: string; elo: number; match_count: number; win_count: number }>;

console.log('\n🏆 Top Ratings:');
for (const r of topRatings) {
  console.log(`   ${r.name} [${r.category}]: ${r.elo} (${r.win_count}/${r.match_count})`);
}

sqlite.close();
