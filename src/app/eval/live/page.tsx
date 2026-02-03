'use client';

import * as React from 'react';
import {
  Play,
  Square,
  Send,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Volume2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// ---------- Types ----------

interface Provider {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
}

interface Scenario {
  id: string;
  name: string;
  prompt: string;
  type: string;
  difficulty: string;
}

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

const RATING_METRICS = ['naturalness', 'prosody', 'accuracy', 'helpfulness', 'efficiency'] as const;

const METRIC_LABELS: Record<string, string> = {
  naturalness: '🗣️ Natural',
  prosody: '🎵 Prosody',
  accuracy: '✅ Accurate',
  helpfulness: '💡 Helpful',
  efficiency: '⚡ Efficient',
};

// ---------- Component ----------

export default function LiveEvalPage() {
  // Setup state
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
  const [selectedProviderId, setSelectedProviderId] = React.useState<string>('');
  const [selectedScenarioId, setSelectedScenarioId] = React.useState<string>('');
  const [freestylePrompt, setFreestylePrompt] = React.useState('');
  const [isLoadingSetup, setIsLoadingSetup] = React.useState(true);

  // Session state
  const [sessionId, setSessionId] = React.useState<number | null>(null);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [followUpText, setFollowUpText] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [isEnding, setIsEnding] = React.useState(false);
  const [sessionEnded, setSessionEnded] = React.useState(false);

  // Audio ref
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playingTurnId, setPlayingTurnId] = React.useState<number | null>(null);
  const conversationEndRef = React.useRef<HTMLDivElement>(null);

  // Load providers and scenarios
  React.useEffect(() => {
    Promise.all([
      fetch('/api/providers').then(r => r.json()),
      fetch('/api/scenarios').then(r => r.json()),
    ]).then(([provRes, scenRes]) => {
      if (provRes.success) setProviders(provRes.data.filter((p: Provider) => p.isActive));
      if (scenRes.success) setScenarios(scenRes.data);
      setIsLoadingSetup(false);
    }).catch(() => {
      toast.error('Failed to load setup data');
      setIsLoadingSetup(false);
    });
  }, []);

  // Auto-scroll conversation
  React.useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // ---------- Actions ----------

  const startSession = async () => {
    if (!selectedProviderId) {
      toast.error('Select a provider');
      return;
    }

    const scenario = scenarios.find(s => s.id === selectedScenarioId);
    const promptText = scenario?.prompt || freestylePrompt;

    if (!promptText.trim()) {
      toast.error('Select a prompt or type a freestyle prompt');
      return;
    }

    try {
      // Create session
      const res = await fetch('/api/eval/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: Number(selectedProviderId),
          promptId: selectedScenarioId || null,
          freestylePrompt: selectedScenarioId ? null : freestylePrompt,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to create session');
        return;
      }

      setSessionId(data.data.id);
      setTurns([]);
      setSessionEnded(false);

      // Send first turn
      await sendTurn(data.data.id, promptText);
    } catch {
      toast.error('Failed to start session');
    }
  };

  const sendTurn = async (sid: number, content: string) => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/eval/sessions/${sid}/turns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) {
        const newTurns: Turn[] = [];
        if (data.data.userTurn) {
          newTurns.push({ ...data.data.userTurn, ratings: {} });
        }
        if (data.data.assistantTurn) {
          newTurns.push({ ...data.data.assistantTurn, ratings: {} });
        }
        setTurns(prev => [...prev, ...newTurns]);
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUpText.trim() || !sessionId) return;
    const text = followUpText;
    setFollowUpText('');
    await sendTurn(sessionId, text);
  };

  const endSession = async () => {
    if (!sessionId) return;
    setIsEnding(true);
    try {
      await fetch(`/api/eval/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      setSessionEnded(true);
      toast.success('Session saved');
    } catch {
      toast.error('Failed to end session');
    } finally {
      setIsEnding(false);
    }
  };

  const toggleRating = async (turnId: number, metric: string) => {
    if (!sessionId) return;

    const turn = turns.find(t => t.id === turnId);
    if (!turn) return;

    const currentValue = turn.ratings[metric] ?? 0;
    // Cycle: 0 → 1 → -1 → 0
    const nextValue = currentValue === 0 ? 1 : currentValue === 1 ? -1 : 0;

    // Optimistic update
    setTurns(prev =>
      prev.map(t =>
        t.id === turnId
          ? { ...t, ratings: { ...t.ratings, [metric]: nextValue } }
          : t
      )
    );

    try {
      await fetch(`/api/eval/sessions/${sessionId}/turns/${turnId}/ratings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric, value: nextValue }),
      });
    } catch {
      // Revert on failure
      setTurns(prev =>
        prev.map(t =>
          t.id === turnId
            ? { ...t, ratings: { ...t.ratings, [metric]: currentValue } }
            : t
        )
      );
    }
  };

  const playAudio = (turnId: number, audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
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

  // ---------- Computed ----------

  const assistantTurns = turns.filter(t => t.role === 'assistant');
  
  const latencyData = assistantTurns.map((t, i) => ({
    turn: `Turn ${i + 1}`,
    ttfb: t.ttfbMs ?? 0,
    total: t.totalResponseMs ?? 0,
  }));

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

  // Summary ratings
  const allRatings = assistantTurns.flatMap(t =>
    RATING_METRICS.map(m => t.ratings[m]).filter(v => v !== undefined && v !== 0)
  );
  const positiveCount = allRatings.filter(v => v === 1).length;
  const humanScore = allRatings.length > 0
    ? Math.round((positiveCount / allRatings.length) * 100)
    : null;

  // ---------- Render: Setup ----------

  if (!sessionId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Mic className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Eval</h1>
            <p className="text-muted-foreground text-sm">
              Test voice AI providers with real conversations
            </p>
          </div>
        </div>

        {isLoadingSetup ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Start a Session</CardTitle>
              <CardDescription>
                Pick a provider and prompt, then start the conversation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider select */}
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {providers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No providers configured.{' '}
                    <a href="/settings" className="underline">Add one in Settings</a>.
                  </p>
                )}
              </div>

              {/* Prompt select */}
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Select value={selectedScenarioId} onValueChange={(v) => {
                  setSelectedScenarioId(v);
                  if (v) setFreestylePrompt('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a scenario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.difficulty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Freestyle */}
              <div className="space-y-2">
                <Label>Or type a freestyle prompt</Label>
                <Input
                  placeholder="What would you like to ask the AI?"
                  value={freestylePrompt}
                  onChange={(e) => {
                    setFreestylePrompt(e.target.value);
                    if (e.target.value) setSelectedScenarioId('');
                  }}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={startSession}
                disabled={!selectedProviderId || (!selectedScenarioId && !freestylePrompt.trim())}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ---------- Render: Active Session ----------

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mic className="h-5 w-5" />
          <h1 className="text-xl font-bold">Live Eval</h1>
          <Badge variant={sessionEnded ? 'secondary' : 'default'}>
            {sessionEnded ? 'Completed' : 'Active'}
          </Badge>
        </div>
        {!sessionEnded && (
          <Button variant="destructive" onClick={endSession} disabled={isEnding}>
            <Square className="h-4 w-4 mr-2" />
            {isEnding ? 'Ending...' : 'End Session'}
          </Button>
        )}
        {sessionEnded && (
          <Button
            variant="outline"
            onClick={() => {
              setSessionId(null);
              setTurns([]);
              setSessionEnded(false);
            }}
          >
            New Session
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Conversation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Turn cards */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`rounded-lg border p-4 ${
                  turn.role === 'user'
                    ? 'bg-muted/50 border-border'
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={turn.role === 'user' ? 'outline' : 'default'} className="text-xs">
                      {turn.role === 'user' ? 'You' : 'Agent'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Turn {Math.ceil(turn.turnNumber / 2)}
                    </span>
                  </div>
                  {turn.role === 'assistant' && turn.ttfbMs != null && (
                    <span className="text-xs text-muted-foreground">
                      TTFB: {turn.ttfbMs}ms | Total: {turn.totalResponseMs}ms
                    </span>
                  )}
                </div>

                <p className="text-sm whitespace-pre-wrap">{turn.content}</p>

                {/* Audio + Ratings for assistant turns */}
                {turn.role === 'assistant' && (
                  <div className="mt-3 space-y-3">
                    {/* Play audio */}
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

                    {/* Rating buttons */}
                    {!sessionEnded && (
                      <div className="flex flex-wrap gap-2">
                        {RATING_METRICS.map((metric) => {
                          const val = turn.ratings[metric] ?? 0;
                          return (
                            <button
                              key={metric}
                              onClick={() => toggleRating(turn.id, metric)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                val === 1
                                  ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300'
                                  : val === -1
                                  ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300'
                                  : 'bg-muted border-border text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              {val === 1 ? (
                                <ThumbsUp className="h-3 w-3" />
                              ) : val === -1 ? (
                                <ThumbsDown className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {METRIC_LABELS[metric]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 p-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for response...
              </div>
            )}

            <div ref={conversationEndRef} />
          </div>

          {/* Follow-up input */}
          {!sessionEnded && (
            <div className="flex gap-2">
              <Input
                placeholder="Type a follow-up message..."
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleFollowUp();
                  }
                }}
                disabled={isSending}
              />
              <Button
                onClick={handleFollowUp}
                disabled={isSending || !followUpText.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Right: Metrics */}
        <div className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg TTFB</p>
                <p className="text-2xl font-bold">{avgTtfb}<span className="text-sm font-normal text-muted-foreground">ms</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Response</p>
                <p className="text-2xl font-bold">{avgTotal}<span className="text-sm font-normal text-muted-foreground">ms</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Words</p>
                <p className="text-2xl font-bold">{avgWords}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Speech Rate</p>
                <p className="text-2xl font-bold">{avgWpm}<span className="text-sm font-normal text-muted-foreground">wpm</span></p>
              </CardContent>
            </Card>
          </div>

          {/* Latency chart (simple bar visualization) */}
          {latencyData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Latency per Turn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {latencyData.map((d, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{d.turn}</span>
                        <span className="text-muted-foreground">{d.ttfb}ms TTFB / {d.total}ms total</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (d.total / Math.max(...latencyData.map(x => x.total), 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Human score */}
          {humanScore !== null && (
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Human Rating</p>
                <p className="text-3xl font-bold">
                  {humanScore}%
                  <span className="text-sm font-normal text-muted-foreground ml-1">positive</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Summary (when ended) */}
          {sessionEnded && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-700 dark:text-green-400">Session Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Turns</span>
                  <span className="font-medium">{assistantTurns.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg TTFB</span>
                  <span className="font-medium">{avgTtfb}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Response Time</span>
                  <span className="font-medium">{avgTotal}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Word Count</span>
                  <span className="font-medium">{avgWords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Speech Rate</span>
                  <span className="font-medium">{avgWpm} wpm</span>
                </div>
                {humanScore !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Human Score</span>
                    <span className="font-medium">{humanScore}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
