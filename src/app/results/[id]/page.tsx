'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Turn {
  id: number;
  turnNumber: number;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string | null;
  ttfbMs?: number | null;
  totalResponseMs?: number | null;
  wordCount?: number | null;
  speechRateWpm?: number | null;
  audioDurationMs?: number | null;
  werScore?: number | null;
  ratings: Record<string, number>;
}

interface SessionDetail {
  id: number;
  providerName: string;
  providerType: string;
  promptName: string;
  promptText: string;
  freestylePrompt: string | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  turns: Turn[];
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

function StatCard({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="border rounded bg-card p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="font-metric text-xl font-semibold leading-none">
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

export default function SessionDetailPage() {
  const params = useParams();
  const [session, setSession] = React.useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playingTurnId, setPlayingTurnId] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch(`/api/eval/sessions/${params.id}`)
      .then(r => r.json())
      .then(data => { if (data.success) setSession(data.data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [params.id]);

  const playAudio = (turnId: number, audioUrl: string) => {
    if (audioRef.current) audioRef.current.pause();
    if (playingTurnId === turnId) { setPlayingTurnId(null); return; }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingTurnId(turnId);
    audio.play();
    audio.onended = () => setPlayingTurnId(null);
  };

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading session...</div>;
  if (!session) return <div className="p-6 text-sm text-muted-foreground">Session not found.</div>;

  const assistantTurns = session.turns.filter(t => t.role === 'assistant');
  const avg = (fn: (t: Turn) => number) =>
    assistantTurns.length > 0 ? Math.round(assistantTurns.reduce((s, t) => s + fn(t), 0) / assistantTurns.length) : 0;

  const avgTtfb = avg(t => t.ttfbMs ?? 0);
  const avgTotal = avg(t => t.totalResponseMs ?? 0);
  const avgWords = avg(t => t.wordCount ?? 0);
  const avgWpm = avg(t => t.speechRateWpm ?? 0);

  const werTurns = assistantTurns.filter(t => t.werScore != null);
  const avgWer = werTurns.length > 0
    ? Math.round(werTurns.reduce((s, t) => s + (t.werScore ?? 0), 0) / werTurns.length * 100) / 100
    : null;

  const durationTurns = assistantTurns.filter(t => t.audioDurationMs != null);
  const avgDuration = durationTurns.length > 0
    ? (durationTurns.reduce((s, t) => s + (t.audioDurationMs ?? 0), 0) / durationTurns.length / 1000).toFixed(1)
    : null;

  const metricSummary = RATING_METRICS.map(metric => {
    const ratings = assistantTurns.map(t => t.ratings[metric]).filter(v => v !== undefined && v !== 0);
    const positive = ratings.filter(v => v === 1).length;
    const total = ratings.length;
    return { metric, label: METRIC_LABELS[metric], positive, negative: total - positive, total, score: total > 0 ? Math.round((positive / total) * 100) : null };
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-6">
      {/* Back */}
      <Link href="/results" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" />
        results
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight">
              Session <span className="font-metric">#{session.id}</span>
            </h1>
            <Badge variant={
              session.status === 'completed' ? 'secondary' :
              session.status === 'active' ? 'default' : 'destructive'
            } className="text-[10px] font-metric">
              {session.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-metric">
            {session.providerName} ({session.providerType}) · {session.promptName} · {formatDate(session.startedAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Turns */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Conversation · <span className="font-metric">{session.turns.length}</span> messages
          </p>

          {session.turns.map((turn) => (
            <div
              key={turn.id}
              className={`border rounded p-3 ${turn.role === 'user' ? 'bg-muted/30' : 'bg-card'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-metric uppercase tracking-wider ${
                    turn.role === 'user' ? 'text-muted-foreground' : 'text-primary'
                  }`}>
                    {turn.role}
                  </span>
                  <span className="text-[11px] text-muted-foreground/50">#{Math.ceil(turn.turnNumber / 2)}</span>
                </div>
                {turn.role === 'assistant' && (
                  <span className="font-metric text-[11px] text-muted-foreground space-x-2">
                    {turn.ttfbMs != null && <span>{turn.ttfbMs}ms ttfb</span>}
                    {turn.totalResponseMs != null && <span>· {turn.totalResponseMs}ms total</span>}
                    {turn.wordCount != null && <span>· {turn.wordCount}w</span>}
                    {turn.speechRateWpm != null && <span>· {turn.speechRateWpm}wpm</span>}
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed">{turn.content}</p>

              {turn.role === 'assistant' && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {turn.audioUrl && (
                    <button
                      onClick={() => playAudio(turn.id, turn.audioUrl!)}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Volume2 className="h-3 w-3" />
                      {playingTurnId === turn.id ? 'stop' : 'play'}
                    </button>
                  )}
                  {RATING_METRICS.map((metric) => {
                    const val = turn.ratings[metric];
                    if (val === undefined || val === 0) return null;
                    return (
                      <span
                        key={metric}
                        className={`inline-flex items-center gap-1 px-1.5 py-0 rounded text-[10px] font-medium border ${
                          val === 1
                            ? 'bg-green-950/50 border-green-800/50 text-green-400'
                            : 'bg-red-950/50 border-red-800/50 text-red-400'
                        }`}
                      >
                        {val === 1 ? <ThumbsUp className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />}
                        {METRIC_LABELS[metric]}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Performance</p>

          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Avg TTFB" value={avgTtfb} unit="ms" />
            <StatCard label="Avg Response" value={avgTotal} unit="ms" />
            <StatCard label="Avg Words" value={avgWords} />
            <StatCard label="Speech Rate" value={avgWpm} unit="wpm" />
            <StatCard label="WER" value={avgWer !== null ? `${(avgWer * 100).toFixed(1)}%` : '—'} />
            <StatCard label="Audio Duration" value={avgDuration !== null ? avgDuration : '—'} unit={avgDuration !== null ? 's' : undefined} />
          </div>

          {/* Human ratings */}
          <div className="border rounded bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2.5">Human Ratings</p>
            <div className="space-y-2.5">
              {metricSummary.map(({ metric, label, positive, negative, total, score }) => (
                <div key={metric}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-metric">
                      {score !== null ? (
                        <span className={score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                          {score}%
                        </span>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="h-1.5 rounded-sm bg-muted overflow-hidden flex">
                      <div className="h-full bg-green-500/70" style={{ width: `${score}%` }} />
                      <div className="h-full bg-red-500/40" style={{ width: `${100 - (score ?? 0)}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Latency per turn */}
          {assistantTurns.length > 0 && (
            <div className="border rounded bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2.5">Latency per Turn</p>
              <div className="space-y-2">
                {assistantTurns.map((t, i) => {
                  const maxTotal = Math.max(...assistantTurns.map(x => x.totalResponseMs ?? 0), 1);
                  return (
                    <div key={t.id}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="font-metric text-muted-foreground">T{i + 1}</span>
                        <span className="font-metric text-muted-foreground">{t.ttfbMs} / {t.totalResponseMs}ms</span>
                      </div>
                      <div className="h-1.5 rounded-sm bg-muted overflow-hidden">
                        <div
                          className="h-full bg-chart-1 rounded-sm"
                          style={{ width: `${Math.min(100, ((t.totalResponseMs ?? 0) / maxTotal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
