'use client';

import * as React from 'react';
import {
  Play,
  Square,
  Send,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// ---------- Types ----------

interface Provider { id: number; name: string; type: string; isActive: boolean; }
interface Scenario { id: string; name: string; prompt: string; type: string; difficulty: string; }
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
  naturalness: 'Natural', prosody: 'Prosody', accuracy: 'Accurate',
  helpfulness: 'Helpful', efficiency: 'Efficient',
};

// ---------- Stat Card ----------

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

// ---------- Component ----------

export default function LiveEvalPage() {
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
  const [selectedProviderId, setSelectedProviderId] = React.useState<string>('');
  const [selectedScenarioId, setSelectedScenarioId] = React.useState<string>('');
  const [freestylePrompt, setFreestylePrompt] = React.useState('');
  const [isLoadingSetup, setIsLoadingSetup] = React.useState(true);

  const [sessionId, setSessionId] = React.useState<number | null>(null);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [followUpText, setFollowUpText] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [isEnding, setIsEnding] = React.useState(false);
  const [sessionEnded, setSessionEnded] = React.useState(false);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playingTurnId, setPlayingTurnId] = React.useState<number | null>(null);
  const conversationEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/providers').then(r => r.json()),
      fetch('/api/scenarios').then(r => r.json()),
    ]).then(([provRes, scenRes]) => {
      if (provRes.success) setProviders(provRes.data.filter((p: Provider) => p.isActive));
      if (scenRes.success) setScenarios(scenRes.data);
      setIsLoadingSetup(false);
    }).catch(() => { toast.error('Failed to load setup'); setIsLoadingSetup(false); });
  }, []);

  React.useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // ---------- Actions ----------

  const startSession = async () => {
    if (!selectedProviderId) { toast.error('Select a provider'); return; }
    const scenario = scenarios.find(s => s.id === selectedScenarioId);
    const promptText = scenario?.prompt || freestylePrompt;
    if (!promptText.trim()) { toast.error('Select a prompt or type one'); return; }

    try {
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
      if (!data.success) { toast.error(data.error || 'Failed'); return; }
      setSessionId(data.data.id);
      setTurns([]);
      setSessionEnded(false);
      await sendTurn(data.data.id, promptText);
    } catch { toast.error('Failed to start'); }
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
        if (data.data.userTurn) newTurns.push({ ...data.data.userTurn, ratings: {} });
        if (data.data.assistantTurn) newTurns.push({ ...data.data.assistantTurn, ratings: {} });
        setTurns(prev => [...prev, ...newTurns]);
      } else toast.error(data.error || 'Failed');
    } catch { toast.error('Failed to send'); }
    finally { setIsSending(false); }
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
    } catch { toast.error('Failed'); }
    finally { setIsEnding(false); }
  };

  const toggleRating = async (turnId: number, metric: string) => {
    if (!sessionId) return;
    const turn = turns.find(t => t.id === turnId);
    if (!turn) return;
    const cur = turn.ratings[metric] ?? 0;
    const next = cur === 0 ? 1 : cur === 1 ? -1 : 0;
    setTurns(prev => prev.map(t => t.id === turnId ? { ...t, ratings: { ...t.ratings, [metric]: next } } : t));
    try {
      await fetch(`/api/eval/sessions/${sessionId}/turns/${turnId}/ratings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric, value: next }),
      });
    } catch {
      setTurns(prev => prev.map(t => t.id === turnId ? { ...t, ratings: { ...t.ratings, [metric]: cur } } : t));
    }
  };

  const playAudio = (turnId: number, audioUrl: string) => {
    if (audioRef.current) audioRef.current.pause();
    if (playingTurnId === turnId) { setPlayingTurnId(null); return; }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingTurnId(turnId);
    audio.play();
    audio.onended = () => setPlayingTurnId(null);
  };

  // ---------- Computed ----------

  const assistantTurns = turns.filter(t => t.role === 'assistant');
  const avg = (arr: Turn[], fn: (t: Turn) => number) =>
    arr.length > 0 ? Math.round(arr.reduce((s, t) => s + fn(t), 0) / arr.length) : 0;

  const avgTtfb = avg(assistantTurns, t => t.ttfbMs ?? 0);
  const avgTotal = avg(assistantTurns, t => t.totalResponseMs ?? 0);
  const avgWords = avg(assistantTurns, t => t.wordCount ?? 0);
  const avgWpm = avg(assistantTurns, t => t.speechRateWpm ?? 0);

  const allRatings = assistantTurns.flatMap(t =>
    RATING_METRICS.map(m => t.ratings[m]).filter(v => v !== undefined && v !== 0)
  );
  const humanScore = allRatings.length > 0
    ? Math.round((allRatings.filter(v => v === 1).length / allRatings.length) * 100)
    : null;

  // ---------- Render: Setup ----------

  if (!sessionId) {
    return (
      <div className="p-6 max-w-xl">
        <div className="mb-6">
          <h1 className="text-lg font-semibold tracking-tight">Live Eval</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Send prompts to a provider and evaluate responses in real time
          </p>
        </div>

        {isLoadingSetup ? (
          <div className="text-sm text-muted-foreground py-12">Loading...</div>
        ) : (
          <div className="border rounded bg-card p-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select provider..." /></SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} <span className="text-muted-foreground">({p.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {providers.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No providers. <a href="/settings" className="underline">Add one →</a>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Scenario</Label>
              <Select value={selectedScenarioId} onValueChange={(v) => { setSelectedScenarioId(v); if (v) setFreestylePrompt(''); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select scenario..." /></SelectTrigger>
                <SelectContent>
                  {scenarios.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      <span className="text-muted-foreground ml-1">({s.difficulty})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Or freestyle</Label>
              <Input
                className="h-9"
                placeholder="Type a custom prompt..."
                value={freestylePrompt}
                onChange={(e) => { setFreestylePrompt(e.target.value); if (e.target.value) setSelectedScenarioId(''); }}
              />
            </div>

            <Button
              className="w-full"
              onClick={startSession}
              disabled={!selectedProviderId || (!selectedScenarioId && !freestylePrompt.trim())}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start Session
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ---------- Render: Active Session ----------

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight">Live Eval</h1>
          <Badge variant={sessionEnded ? 'secondary' : 'default'} className="text-[11px]">
            {sessionEnded ? 'completed' : 'active'}
          </Badge>
        </div>
        {!sessionEnded ? (
          <Button variant="destructive" size="sm" onClick={endSession} disabled={isEnding}>
            <Square className="h-3 w-3 mr-1.5" />
            {isEnding ? 'Ending...' : 'End Session'}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => { setSessionId(null); setTurns([]); setSessionEnded(false); }}>
            New Session
          </Button>
        )}
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
                    {turn.audioUrl && (
                      <button
                        onClick={() => playAudio(turn.id, turn.audioUrl!)}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Volume2 className="h-3 w-3" />
                        {playingTurnId === turn.id ? 'stop' : 'play audio'}
                      </button>
                    )}

                    {!sessionEnded && (
                      <div className="flex flex-wrap gap-1.5">
                        {RATING_METRICS.map((metric) => {
                          const val = turn.ratings[metric] ?? 0;
                          return (
                            <button
                              key={metric}
                              onClick={() => toggleRating(turn.id, metric)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                                val === 1
                                  ? 'bg-green-950/50 border-green-800/50 text-green-400'
                                  : val === -1
                                  ? 'bg-red-950/50 border-red-800/50 text-red-400'
                                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                              }`}
                            >
                              {val === 1 ? <ThumbsUp className="h-2.5 w-2.5" /> :
                               val === -1 ? <ThumbsDown className="h-2.5 w-2.5" /> :
                               <Minus className="h-2.5 w-2.5" />}
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
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for response...
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          {!sessionEnded && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Input
                className="h-9"
                placeholder="Follow-up message..."
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFollowUp(); } }}
                disabled={isSending}
              />
              <Button size="sm" className="h-9 px-3" onClick={handleFollowUp} disabled={isSending || !followUpText.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Right: Metrics panel */}
        <div className="space-y-4">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Avg TTFB" value={avgTtfb} unit="ms" />
            <StatCard label="Avg Response" value={avgTotal} unit="ms" />
            <StatCard label="Avg Words" value={avgWords} />
            <StatCard label="Speech Rate" value={avgWpm} unit="wpm" />
          </div>

          {/* Latency bars */}
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
                        <span className="font-metric text-muted-foreground">{t.ttfbMs}ms / {t.totalResponseMs}ms</span>
                      </div>
                      <div className="h-1.5 rounded-sm bg-muted overflow-hidden">
                        <div
                          className="h-full bg-chart-1 rounded-sm transition-all"
                          style={{ width: `${Math.min(100, ((t.totalResponseMs ?? 0) / maxTotal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Human score */}
          {humanScore !== null && (
            <div className="border rounded bg-card p-3 text-center">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Human Rating</p>
              <p className="font-metric text-2xl font-semibold">
                {humanScore}%
              </p>
            </div>
          )}

          {/* Summary */}
          {sessionEnded && (
            <div className="border border-green-800/30 rounded bg-green-950/20 p-3">
              <p className="text-[11px] text-green-400 uppercase tracking-wider mb-2">Session Summary</p>
              <div className="space-y-1.5 text-sm">
                {[
                  ['Turns', assistantTurns.length],
                  ['Avg TTFB', `${avgTtfb}ms`],
                  ['Avg Response', `${avgTotal}ms`],
                  ['Avg Words', avgWords],
                  ['Speech Rate', `${avgWpm} wpm`],
                  ...(humanScore !== null ? [['Human Score', `${humanScore}%`]] : []),
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-metric font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
