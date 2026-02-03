'use client';

import * as React from 'react';
import Link from 'next/link';
import { BarChart3, Calendar, ChevronRight, Clock, MessageSquare, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

interface Provider {
  id: number;
  name: string;
  type: string;
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

  // Summary stats
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const totalSessions = sessions.length;
  const avgLatency = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((s, sess) => s + (sess.avgTtfbMs ?? 0), 0) / completedSessions.length)
    : 0;
  const ratingSessions = completedSessions.filter(s => s.humanScore !== null);
  const avgHumanScore = ratingSessions.length > 0
    ? Math.round(ratingSessions.reduce((s, sess) => s + (sess.humanScore ?? 0), 0) / ratingSessions.length)
    : null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Results</h1>
          <p className="text-muted-foreground text-sm">
            Review and compare eval session results
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </div>
            <p className="text-2xl font-bold">{totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <p className="text-2xl font-bold">{completedSessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Latency</p>
            </div>
            <p className="text-2xl font-bold">{avgLatency}<span className="text-sm font-normal text-muted-foreground">ms</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Human Rating</p>
            </div>
            <p className="text-2xl font-bold">
              {avgHumanScore !== null ? `${avgHumanScore}%` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="aborted">Aborted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading results...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {sessions.length === 0 ? (
            <div>
              <p>No eval sessions yet.</p>
              <Link href="/eval/live" className="text-primary underline text-sm mt-2 inline-block">
                Start your first eval →
              </Link>
            </div>
          ) : (
            'No sessions match your filters.'
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Turns</TableHead>
                <TableHead className="text-center">Avg TTFB</TableHead>
                <TableHead className="text-center">Human Score</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((session) => (
                <TableRow key={session.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{session.providerName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {session.promptName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(session.startedAt)}
                  </TableCell>
                  <TableCell className="text-center">{session.turnCount}</TableCell>
                  <TableCell className="text-center">
                    {session.avgTtfbMs != null ? `${session.avgTtfbMs}ms` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {session.humanScore != null ? (
                      <span className={session.humanScore >= 70 ? 'text-green-600' : session.humanScore >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                        {session.humanScore}%
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      session.status === 'completed' ? 'default' :
                      session.status === 'active' ? 'secondary' : 'destructive'
                    } className="text-xs">
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/results/${session.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
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
