'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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

export default function ResultsPage() {
  const [sessions, setSessions] = React.useState<SessionSummary[]>([]);
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filterProvider, setFilterProvider] = React.useState<string>('all');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');

  React.useEffect(() => {
    Promise.all([
      fetch('/api/eval/sessions').then(r => r.json()),
      fetch('/api/providers').then(r => r.json()),
    ]).then(([sessRes, provRes]) => {
      if (sessRes.success) setSessions(sessRes.data);
      if (provRes.success) setProviders(provRes.data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const filtered = sessions.filter(s => {
    if (filterProvider !== 'all' && s.providerId !== Number(filterProvider)) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const completedSessions = sessions.filter(s => s.status === 'completed');
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <StatCard label="Total Sessions" value={sessions.length} />
        <StatCard label="Completed" value={completedSessions.length} />
        <StatCard label="Avg TTFB" value={avgLatency} unit="ms" />
        <StatCard label="Avg Human Rating" value={avgHumanScore !== null ? `${avgHumanScore}%` : '—'} />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
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
      </div>

      {/* Table */}
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
        <div className="border rounded">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Provider</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Prompt</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Date</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9 text-right">Turns</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9 text-right">TTFB</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9 text-right">Human</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9 w-[70px]">Status</TableHead>
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
