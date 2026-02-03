'use client';

import * as React from 'react';
import {
  Square,
  Send,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ---------- Types ----------

interface Turn {
  id: number;
  turnNumber: number;
  role: 'user' | 'assistant';
  content: string;
  ttfbMs?: number | null;
  totalResponseMs?: number | null;
  wordCount?: number | null;
  speechRateWpm?: number | null;
  audioDurationMs?: number | null;
  werScore?: number | null;
  ratings: Record<string, number>;
}

const RATING_METRICS = [
  'naturalness', 'prosody', 'accuracy', 'helpfulness', 'efficiency',
  'emotion', 'turn_taking', 'interruption_handling',
] as const;
const METRIC_LABELS: Record<string, string> = {
  naturalness: 'Natural', prosody: 'Prosody', accuracy: 'Accurate',
  helpfulness: 'Helpful', efficiency: 'Efficient',
  emotion: 'Emotion', turn_taking: 'Turn-taking', interruption_handling: 'Interruptions',
};

// ---------- SparkLine ----------

function SparkLine({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

// ---------- Stat Card ----------

function StatCard({ label, value, unit, accent }: { label: string; value: number | string; unit?: string; accent: string }) {
  return (
    <div className={`border border-l-2 ${accent} rounded-md bg-card p-3`}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      <p className="font-metric text-2xl font-bold leading-none tracking-tight">
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  );
}

// ---------- Demo Data ----------

const DEMO_TURNS: Turn[] = [
  {
    id: 1,
    turnNumber: 1,
    role: 'user',
    content: 'Hi, I\'d like to book a table for four at an Italian restaurant downtown for this Saturday evening around 7pm.',
    ratings: {},
  },
  {
    id: 2,
    turnNumber: 2,
    role: 'assistant',
    content: 'I\'d be happy to help you with that! I found a few great Italian restaurants downtown with availability this Saturday at 7pm. The top option is Trattoria Milano — they have a table for four available at 7:15pm. Shall I go ahead and book that, or would you like to hear the other options?',
    ttfbMs: 245,
    totalResponseMs: 1820,
    wordCount: 52,
    speechRateWpm: 165,
    audioDurationMs: 18900,
    werScore: 0.04,
    ratings: { naturalness: 1, prosody: 1, accuracy: 1, helpfulness: 1, efficiency: 0, emotion: 1, turn_taking: 1, interruption_handling: 0 },
  },
  {
    id: 3,
    turnNumber: 3,
    role: 'user',
    content: 'What are the other options? And do any of them have outdoor seating?',
    ratings: {},
  },
  {
    id: 4,
    turnNumber: 4,
    role: 'assistant',
    content: 'Of course! Here are your other options: Casa Bella has a lovely rooftop terrace and can seat you at 7pm sharp. They\'re known for their handmade pasta. Then there\'s Sapori d\'Italia which has a garden patio — they have 7:30pm available. Both have outdoor seating. Trattoria Milano is indoor only.',
    ttfbMs: 312,
    totalResponseMs: 2450,
    wordCount: 54,
    speechRateWpm: 148,
    audioDurationMs: 21800,
    werScore: 0.07,
    ratings: { naturalness: 1, prosody: 0, accuracy: 1, helpfulness: 1, efficiency: 1, emotion: 0, turn_taking: 1, interruption_handling: 1 },
  },
  {
    id: 5,
    turnNumber: 5,
    role: 'user',
    content: 'Casa Bella sounds perfect. Can you book it for 7pm, four people, under the name Martinez?',
    ratings: {},
  },
  {
    id: 6,
    turnNumber: 6,
    role: 'assistant',
    content: 'Done! I\'ve booked Casa Bella for Saturday at 7pm, table for four under Martinez. You\'ll be on the rooftop terrace. They do ask for a confirmation call 24 hours before — I can set a reminder for you on Friday evening if you\'d like. Anything else?',
    ttfbMs: 189,
    totalResponseMs: 1340,
    wordCount: 48,
    speechRateWpm: 172,
    audioDurationMs: 16700,
    werScore: 0.02,
    ratings: { naturalness: 1, prosody: 1, accuracy: 1, helpfulness: 1, efficiency: 1, emotion: 1, turn_taking: 1, interruption_handling: 1 },
  },
];

// ---------- Component ----------

export default function DemoEvalPage() {
  const turns = DEMO_TURNS;
  const assistantTurns = turns.filter(t => t.role === 'assistant');

  const avg = (arr: Turn[], fn: (t: Turn) => number) =>
    arr.length > 0 ? Math.round(arr.reduce((s, t) => s + fn(t), 0) / arr.length) : 0;

  const avgTtfb = avg(assistantTurns, t => t.ttfbMs ?? 0);
  const avgTotal = avg(assistantTurns, t => t.totalResponseMs ?? 0);
  const avgWords = avg(assistantTurns, t => t.wordCount ?? 0);
  const avgWpm = avg(assistantTurns, t => t.speechRateWpm ?? 0);

  const werTurns = assistantTurns.filter(t => t.werScore != null);
  const avgWer = werTurns.length > 0
    ? Math.round(werTurns.reduce((s, t) => s + (t.werScore ?? 0), 0) / werTurns.length * 100) / 100
    : null;

  const durationTurns = assistantTurns.filter(t => t.audioDurationMs != null);
  const avgDuration = durationTurns.length > 0
    ? (durationTurns.reduce((s, t) => s + (t.audioDurationMs ?? 0), 0) / durationTurns.length / 1000).toFixed(1)
    : null;

  const ttfbTrend = assistantTurns.map(t => t.ttfbMs ?? 0);
  const responseTrend = assistantTurns.map(t => t.totalResponseMs ?? 0);
  const wpmTrend = assistantTurns.map(t => t.speechRateWpm ?? 0);

  const allRatings = assistantTurns.flatMap(t =>
    RATING_METRICS.map(m => t.ratings[m]).filter(v => v !== undefined && v !== 0)
  );
  const humanScore = allRatings.length > 0
    ? Math.round((allRatings.filter(v => v === 1).length / allRatings.length) * 100)
    : null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight">Live Eval</h1>
          <Badge variant="default" className="text-[11px]">active</Badge>
          <span className="text-xs text-muted-foreground ml-1">OpenAI Realtime · Restaurant Booking</span>
        </div>
        <Button variant="destructive" size="sm" disabled>
          <Square className="h-3 w-3 mr-1.5" />
          End Session
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Conversation */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex-1 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`border rounded p-3 ${
                  turn.role === 'user' ? 'bg-muted/30' : 'bg-card'
                }`}
              >
                {/* Turn header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-metric uppercase tracking-wider ${
                      turn.role === 'user' ? 'text-muted-foreground' : 'text-primary'
                    }`}>
                      {turn.role === 'user' ? 'user' : 'agent'}
                    </span>
                    <span className="text-[11px] text-muted-foreground/50">#{Math.ceil(turn.turnNumber / 2)}</span>
                  </div>
                  {turn.role === 'assistant' && turn.ttfbMs != null && (
                    <span className="font-metric text-[11px] text-muted-foreground">
                      {turn.ttfbMs}ms ttfb · {turn.totalResponseMs}ms total
                    </span>
                  )}
                </div>

                <p className="text-sm leading-relaxed">{turn.content}</p>

                {turn.role === 'assistant' && (
                  <div className="mt-2.5 space-y-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {RATING_METRICS.map((metric) => {
                        const val = turn.ratings[metric] ?? 0;
                        return (
                          <span
                            key={metric}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                              val === 1
                                ? 'bg-green-950/50 border-green-800/50 text-green-400'
                                : val === -1
                                ? 'bg-red-950/50 border-red-800/50 text-red-400'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            {val === 1 ? <ThumbsUp className="h-2.5 w-2.5" /> :
                             val === -1 ? <ThumbsDown className="h-2.5 w-2.5" /> :
                             <Minus className="h-2.5 w-2.5" />}
                            {METRIC_LABELS[metric]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Follow-up input (visible, non-functional) */}
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Input
              className="h-9"
              placeholder="Follow-up message..."
              disabled
            />
            <Button size="sm" className="h-9 px-3" disabled>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Right: Metrics panel */}
        <div className="space-y-4">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard label="Avg TTFB" value={avgTtfb} unit="ms" accent="border-l-emerald-500" />
            <StatCard label="Avg Response" value={avgTotal} unit="ms" accent="border-l-blue-500" />
            <StatCard label="Avg Words" value={avgWords} accent="border-l-orange-400" />
            <StatCard label="Speech Rate" value={avgWpm} unit="wpm" accent="border-l-teal-400" />
            <StatCard label="WER" value={avgWer !== null ? `${(avgWer * 100).toFixed(1)}%` : '—'} accent="border-l-violet-500" />
            <StatCard label="Audio Duration" value={avgDuration !== null ? avgDuration : '—'} unit={avgDuration !== null ? 's' : undefined} accent="border-l-rose-500" />
          </div>

          {/* Sparkline trends */}
          {assistantTurns.length >= 2 && (
            <div className="border rounded-md bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Trends</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-emerald-400 mb-1">TTFB</p>
                  <SparkLine data={ttfbTrend} color="#34d399" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-400 mb-1">Response Time</p>
                  <SparkLine data={responseTrend} color="#60a5fa" />
                </div>
                <div>
                  <p className="text-[10px] text-teal-400 mb-1">Speech Rate</p>
                  <SparkLine data={wpmTrend} color="#2dd4bf" />
                </div>
              </div>
            </div>
          )}

          {/* Latency bars */}
          <div className="border rounded-md bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2.5">Latency per Turn</p>
            <div className="space-y-2.5">
              {assistantTurns.map((t, i) => {
                const maxTotal = Math.max(...assistantTurns.map(x => x.totalResponseMs ?? 0), 1);
                const total = t.totalResponseMs ?? 0;
                const pct = Math.min(100, (total / maxTotal) * 100);
                const barColor = total < 1000 ? 'bg-emerald-500' : total < 3000 ? 'bg-orange-400' : 'bg-red-400';
                return (
                  <div key={t.id}>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="font-metric text-muted-foreground">T{i + 1}</span>
                      <span className="font-metric text-muted-foreground">{t.ttfbMs}ms / {total}ms</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Human score */}
          {humanScore !== null && (
            <div className="border rounded-md bg-card p-3 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Human Rating</p>
              <p className="font-metric text-3xl font-bold tracking-tight">
                <span className={humanScore >= 70 ? 'text-emerald-400' : humanScore >= 40 ? 'text-orange-400' : 'text-red-400'}>
                  {humanScore}%
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
