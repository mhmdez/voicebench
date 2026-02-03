'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Download, BarChart3, List, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

/* ---------- Types ---------- */

interface SessionSummary {
  id: number;
  providerId: number;
  providerName: string;
  promptId: string | null;
  promptName: string;
  freestylePrompt: string | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  turnCount: number;
  avgTtfbMs: number | null;
  humanScore: number | null;
}

interface Provider { id: number; name: string; type: string; }

interface ProviderAnalytics {
  id: number;
  name: string;
  type: string;
  sessionCount: number;
  completedCount: number;
  avgTtfbMs: number | null;
  avgResponseMs: number | null;
  avgHumanScore: number | null;
}

interface PromptAnalytics {
  promptId: string | null;
  promptName: string;
  timesUsed: number;
  avgTtfbMs: number | null;
  avgResponseMs: number | null;
  avgHumanScore: number | null;
}

interface MetricAnalytics {
  metric: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positivePercent: number;
}

interface AnalyticsData {
  providers: ProviderAnalytics[];
  prompts: PromptAnalytics[];
  metrics: MetricAnalytics[];
}

/* ---------- Provider Colors ---------- */

const PROVIDER_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

function getProviderColor(index: number) {
  return PROVIDER_COLORS[index % PROVIDER_COLORS.length];
}

/* ---------- Reusable Chart Components ---------- */

function HorizontalBarChart({ data, unit }: { data: { label: string; value: number; color: string }[]; unit?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-[11px] mb-0.5">
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-metric">{d.value}{unit ?? ''}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricBar({ label, percent }: { label: string; percent: number }) {
  const color = percent >= 70 ? '#10b981' : percent >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="text-muted-foreground capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="font-metric" style={{ color }}>{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ---------- Stat Card ---------- */

function StatCard({ label, value, unit, accent }: { label: string; value: number | string; unit?: string; accent?: string }) {
  return (
    <div className={`border border-l-2 ${accent || 'border-l-blue-500'} rounded-md bg-card p-4`}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <p className="font-metric text-2xl font-bold leading-none tracking-tight">
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  );
}

/* ---------- Date Range Helpers ---------- */

type DateRange = '7d' | '30d' | 'all';

function filterByDateRange(sessions: SessionSummary[], range: DateRange): SessionSummary[] {
  if (range === 'all') return sessions;
  const now = Date.now();
  const ms = range === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return sessions.filter(s => now - new Date(s.startedAt).getTime() <= ms);
}

/* ---------- CSV Export ---------- */

function exportCSV(sessions: SessionSummary[]) {
  const headers = ['ID', 'Provider', 'Prompt', 'Date', 'Status', 'Turns', 'TTFB (ms)', 'Human Score (%)'];
  const rows = sessions.map(s => [
    s.id,
    s.providerName,
    s.promptName,
    new Date(s.startedAt).toISOString(),
    s.status,
    s.turnCount,
    s.avgTtfbMs ?? '',
    s.humanScore ?? '',
  ]);

  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voicebench-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Main Page ---------- */

export default function ResultsPage() {
  const [sessions, setSessions] = React.useState<SessionSummary[]>([]);
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filterProvider, setFilterProvider] = React.useState<string>('all');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [filterPrompt, setFilterPrompt] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange>('all');

  React.useEffect(() => {
    Promise.all([
      fetch('/api/eval/sessions').then(r => r.json()),
      fetch('/api/providers').then(r => r.json()),
      fetch('/api/eval/analytics').then(r => r.json()),
    ]).then(([sessRes, provRes, analyticsRes]) => {
      if (sessRes.success) setSessions(sessRes.data);
      if (provRes.success) setProviders(provRes.data);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  // Apply all filters
  const dateFiltered = filterByDateRange(sessions, dateRange);
  const filtered = dateFiltered.filter(s => {
    if (filterProvider !== 'all' && s.providerId !== Number(filterProvider)) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterPrompt !== null && s.promptId !== filterPrompt) return false;
    return true;
  });

  // Stats from filtered sessions
  const completedSessions = dateFiltered.filter(s => s.status === 'completed');
  const avgLatency = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((s, sess) => s + (sess.avgTtfbMs ?? 0), 0) / completedSessions.length)
    : 0;
  const ratingSessions = completedSessions.filter(s => s.humanScore !== null);
  const avgHumanScore = ratingSessions.length > 0
    ? Math.round(ratingSessions.reduce((s, sess) => s + (sess.humanScore ?? 0), 0) / ratingSessions.length)
    : null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-lg font-semibold tracking-tight">Results</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Session history and performance analytics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Sessions" value={dateFiltered.length} accent="border-l-blue-500" />
        <StatCard label="Completed" value={completedSessions.length} accent="border-l-emerald-500" />
        <StatCard label="Avg TTFB" value={avgLatency} unit="ms" accent="border-l-orange-400" />
        <StatCard label="Avg Human Rating" value={avgHumanScore !== null ? `${avgHumanScore}%` : '—'} accent="border-l-violet-500" />
      </div>

      {/* Analytics Tabs */}
      {analytics && (
        <Tabs defaultValue="overview" className="mb-6">
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <BarChart3 className="size-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="by-prompt" className="gap-1.5 text-xs">
              <List className="size-3.5" />
              By Prompt
            </TabsTrigger>
            <TabsTrigger value="by-metric" className="gap-1.5 text-xs">
              <Target className="size-3.5" />
              By Metric
            </TabsTrigger>
          </TabsList>

          {/* --- Overview Tab --- */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-4">
              {/* TTFB by Provider */}
              <div className="border rounded-md bg-card p-4">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Avg TTFB by Provider
                </h3>
                {analytics.providers.filter(p => p.avgTtfbMs != null).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No TTFB data yet</p>
                ) : (
                  <HorizontalBarChart
                    unit="ms"
                    data={analytics.providers
                      .filter(p => p.avgTtfbMs != null)
                      .sort((a, b) => (a.avgTtfbMs ?? 0) - (b.avgTtfbMs ?? 0))
                      .map((p, i) => ({
                        label: p.name,
                        value: p.avgTtfbMs!,
                        color: getProviderColor(i),
                      }))}
                  />
                )}
              </div>

              {/* Human Rating by Provider */}
              <div className="border rounded-md bg-card p-4">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Avg Human Rating by Provider
                </h3>
                {analytics.providers.filter(p => p.avgHumanScore != null).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No rating data yet</p>
                ) : (
                  <HorizontalBarChart
                    unit="%"
                    data={analytics.providers
                      .filter(p => p.avgHumanScore != null)
                      .sort((a, b) => (b.avgHumanScore ?? 0) - (a.avgHumanScore ?? 0))
                      .map((p, i) => ({
                        label: p.name,
                        value: p.avgHumanScore!,
                        color: getProviderColor(i),
                      }))}
                  />
                )}
              </div>

              {/* Provider Session Counts */}
              <div className="border rounded-md bg-card p-4 md:col-span-2">
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Sessions by Provider
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {analytics.providers.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getProviderColor(i) }} />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{p.name}</p>
                        <p className="font-metric text-sm font-semibold">
                          {p.completedCount}<span className="text-muted-foreground font-normal">/{p.sessionCount}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* --- By Prompt Tab --- */}
          <TabsContent value="by-prompt">
            <div className="border rounded-md bg-card/50">
              {analytics.prompts.length === 0 ? (
                <p className="text-xs text-muted-foreground p-6 text-center">No prompt data yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9">Prompt</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9 text-right">Used</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9 text-right">Avg TTFB</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9 text-right">Avg Response</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9 text-right">Human Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.prompts.map((p, i) => (
                      <TableRow
                        key={p.promptId ?? `freestyle-${i}`}
                        className={`cursor-pointer transition-colors ${filterPrompt === p.promptId ? 'bg-accent/50' : ''}`}
                        onClick={() => {
                          setFilterPrompt(prev => prev === p.promptId ? null : p.promptId);
                        }}
                      >
                        <TableCell className="text-sm font-medium py-2 max-w-[240px] truncate">
                          {filterPrompt === p.promptId && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 align-middle" />
                          )}
                          {p.promptName}
                        </TableCell>
                        <TableCell className="text-sm font-metric text-right py-2">{p.timesUsed}</TableCell>
                        <TableCell className="text-sm font-metric text-right py-2">
                          {p.avgTtfbMs != null ? `${p.avgTtfbMs}ms` : '—'}
                        </TableCell>
                        <TableCell className="text-sm font-metric text-right py-2">
                          {p.avgResponseMs != null ? `${p.avgResponseMs}ms` : '—'}
                        </TableCell>
                        <TableCell className="text-sm font-metric text-right py-2">
                          {p.avgHumanScore != null ? (
                            <span className={
                              p.avgHumanScore >= 70 ? 'text-green-400' :
                              p.avgHumanScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                            }>
                              {p.avgHumanScore}%
                            </span>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {filterPrompt !== null && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Filtering sessions below by selected prompt.{' '}
                <button
                  className="text-primary underline"
                  onClick={() => setFilterPrompt(null)}
                >
                  Clear filter
                </button>
              </p>
            )}
          </TabsContent>

          {/* --- By Metric Tab --- */}
          <TabsContent value="by-metric">
            <div className="border rounded-md bg-card p-4">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Metric Breakdown
              </h3>
              {analytics.metrics.every(m => m.total === 0) ? (
                <p className="text-xs text-muted-foreground">No metric ratings yet</p>
              ) : (
                <div className="space-y-4">
                  {analytics.metrics.map(m => (
                    <div key={m.metric} className="flex items-start gap-4">
                      <div className="flex-1">
                        <MetricBar label={m.metric} percent={m.positivePercent} />
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted-foreground font-metric pt-0.5 flex-shrink-0">
                        <span className="text-green-400">+{m.positive}</span>
                        <span className="text-red-400">−{m.negative}</span>
                        <span>○{m.neutral}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Filters + Export */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="aborted">Aborted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder="Date range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => exportCSV(filtered)}
          disabled={filtered.length === 0}
        >
          <Download className="size-3" />
          Export CSV
        </Button>
      </div>

      {/* Session Table */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          {sessions.length === 0 ? (
            <div>
              <p>No sessions yet.</p>
              <Link href="/eval/live" className="text-primary underline text-xs mt-1 inline-block">
                Start your first eval →
              </Link>
            </div>
          ) : 'No matches.'}
        </div>
      ) : (
        <div className="border rounded-md bg-card/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9">Provider</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9">Prompt</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9">Date</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9 text-right">Turns</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9 text-right">TTFB</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9 text-right">Human</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider h-9 w-[70px]">Status</TableHead>
                <TableHead className="h-9 w-[32px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((session) => (
                <TableRow key={session.id} className="group">
                  <TableCell className="text-sm font-medium py-2">{session.providerName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate py-2">
                    {session.promptName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-metric py-2">
                    {formatDate(session.startedAt)}
                  </TableCell>
                  <TableCell className="text-sm font-metric text-right py-2">{session.turnCount}</TableCell>
                  <TableCell className="text-sm font-metric text-right py-2">
                    {session.avgTtfbMs != null ? `${session.avgTtfbMs}ms` : '—'}
                  </TableCell>
                  <TableCell className="text-sm font-metric text-right py-2">
                    {session.humanScore != null ? (
                      <span className={
                        session.humanScore >= 70 ? 'text-green-400' :
                        session.humanScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                      }>
                        {session.humanScore}%
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant={
                      session.status === 'completed' ? 'secondary' :
                      session.status === 'active' ? 'default' : 'destructive'
                    } className="text-[10px] font-metric">
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Link href={`/results/${session.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
