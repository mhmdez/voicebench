'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
  ratings: Record<string, number>;
}

interface SessionDetail {
  id: number;
  providerId: number;
  providerName: string;
  providerType: string;
  promptId: string | null;
  promptName: string;
  promptText: string;
  freestylePrompt: string | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  notes: string | null;
  turns: Turn[];
}

const RATING_METRICS = ['naturalness', 'prosody', 'accuracy', 'helpfulness', 'efficiency'] as const;

const METRIC_LABELS: Record<string, string> = {
  naturalness: '🗣️ Naturalness',
  prosody: '🎵 Prosody',
  accuracy: '✅ Accuracy',
  helpfulness: '💡 Helpfulness',
  efficiency: '⚡ Efficiency',
};

export default function SessionDetailPage() {
  const params = useParams();
  const [session, setSession] = React.useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playingTurnId, setPlayingTurnId] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch(`/api/eval/sessions/${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setSession(data.data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [params.id]);

  const playAudio = (turnId: number, audioUrl: string) => {
    if (audioRef.current) audioRef.current.pause();
    if (playingTurnId === turnId) {
      setPlayingTurnId(null);
      return;
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingTurnId(turnId);
    audio.play();
    audio.onended = () => setPlayingTurnId(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12 text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12 text-muted-foreground">Session not found.</div>
      </div>
    );
  }

  const assistantTurns = session.turns.filter(t => t.role === 'assistant');

  const avgTtfb = assistantTurns.length > 0
    ? Math.round(assistantTurns.reduce((s, t) => s + (t.ttfbMs ?? 0), 0) / assistantTurns.length)
    : 0;

  const avgTotal = assistantTurns.length > 0
    ? Math.round(assistantTurns.reduce((s, t) => s + (t.totalResponseMs ?? 0), 0) / assistantTurns.length)
    : 0;

  const avgWords = assistantTurns.length > 0
    ? Math.round(assistantTurns.reduce((s, t) => s + (t.wordCount ?? 0), 0) / assistantTurns.length)
    : 0;

  const avgWpm = assistantTurns.length > 0
    ? Math.round(assistantTurns.reduce((s, t) => s + (t.speechRateWpm ?? 0), 0) / assistantTurns.length)
    : 0;

  // Per-metric ratings summary
  const metricSummary = RATING_METRICS.map(metric => {
    const ratings = assistantTurns.map(t => t.ratings[metric]).filter(v => v !== undefined && v !== 0);
    const positive = ratings.filter(v => v === 1).length;
    const total = ratings.length;
    return {
      metric,
      label: METRIC_LABELS[metric],
      positive,
      negative: total - positive,
      total,
      score: total > 0 ? Math.round((positive / total) * 100) : null,
    };
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link href="/results" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Results
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Session #{session.id}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{session.providerName} ({session.providerType})</span>
            <span>•</span>
            <span>{session.promptName}</span>
            <span>•</span>
            <span>{formatDate(session.startedAt)}</span>
          </div>
        </div>
        <Badge variant={
          session.status === 'completed' ? 'default' :
          session.status === 'active' ? 'secondary' : 'destructive'
        }>
          {session.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Turn-by-turn detail */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Conversation ({session.turns.length} messages)</h2>

          {session.turns.map((turn) => (
            <div
              key={turn.id}
              className={`rounded-lg border p-4 ${
                turn.role === 'user'
                  ? 'bg-muted/50'
                  : 'bg-card'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={turn.role === 'user' ? 'outline' : 'default'} className="text-xs">
                    {turn.role === 'user' ? 'User' : 'Agent'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Turn {Math.ceil(turn.turnNumber / 2)}
                  </span>
                </div>
                {turn.role === 'assistant' && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {turn.ttfbMs != null && <span>TTFB: {turn.ttfbMs}ms</span>}
                    {turn.totalResponseMs != null && <span>Total: {turn.totalResponseMs}ms</span>}
                    {turn.wordCount != null && <span>{turn.wordCount} words</span>}
                    {turn.speechRateWpm != null && <span>{turn.speechRateWpm} wpm</span>}
                  </div>
                )}
              </div>

              <p className="text-sm whitespace-pre-wrap">{turn.content}</p>

              {turn.role === 'assistant' && (
                <div className="mt-3 space-y-2">
                  {turn.audioUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playAudio(turn.id, turn.audioUrl!)}
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      {playingTurnId === turn.id ? 'Stop' : 'Play Audio'}
                    </Button>
                  )}

                  {/* Ratings display */}
                  <div className="flex flex-wrap gap-2">
                    {RATING_METRICS.map((metric) => {
                      const val = turn.ratings[metric];
                      if (val === undefined || val === 0) return null;
                      return (
                        <span
                          key={metric}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            val === 1
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          }`}
                        >
                          {val === 1 ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
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

        {/* Right: Summary metrics */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Summary</h2>

          {/* Performance stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg TTFB</p>
                <p className="text-xl font-bold">{avgTtfb}<span className="text-sm font-normal text-muted-foreground">ms</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Response</p>
                <p className="text-xl font-bold">{avgTotal}<span className="text-sm font-normal text-muted-foreground">ms</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Words</p>
                <p className="text-xl font-bold">{avgWords}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Speech Rate</p>
                <p className="text-xl font-bold">{avgWpm}<span className="text-sm font-normal text-muted-foreground">wpm</span></p>
              </CardContent>
            </Card>
          </div>

          {/* Human ratings breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Human Ratings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metricSummary.map(({ metric, label, positive, negative, total, score }) => (
                <div key={metric} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{label}</span>
                    <span className="text-muted-foreground">
                      {score !== null ? (
                        <>
                          <span className={score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                            {score}%
                          </span>
                          {' '}({positive}👍 / {negative}👎)
                        </>
                      ) : 'No ratings'}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${score}%` }}
                      />
                      <div
                        className="h-full bg-red-400"
                        style={{ width: `${100 - (score ?? 0)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Latency per turn */}
          {assistantTurns.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Latency per Turn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assistantTurns.map((t, i) => (
                    <div key={t.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Turn {i + 1}</span>
                        <span className="text-muted-foreground">
                          {t.ttfbMs}ms / {t.totalResponseMs}ms
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.min(100, ((t.totalResponseMs ?? 0) / Math.max(...assistantTurns.map(x => x.totalResponseMs ?? 0), 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
