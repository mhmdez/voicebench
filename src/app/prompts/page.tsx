'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Scenario {
  id: string;
  name: string;
  type: string;
  prompt: string;
  expectedOutcome: string;
  tags: string[];
  language: string;
  difficulty: string;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  'task-completion': 'Task',
  'information-retrieval': 'Info',
  'conversation-flow': 'Conv',
};

export default function PromptsPage() {
  const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [filterType, setFilterType] = React.useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const [formName, setFormName] = React.useState('');
  const [formPrompt, setFormPrompt] = React.useState('');
  const [formType, setFormType] = React.useState('task-completion');
  const [formExpectedOutcome, setFormExpectedOutcome] = React.useState('');
  const [formDifficulty, setFormDifficulty] = React.useState('medium');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchScenarios = React.useCallback(async () => {
    try {
      const res = await fetch('/api/scenarios');
      const data = await res.json();
      if (data.success) setScenarios(data.data);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      toast.error('Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchScenarios(); }, [fetchScenarios]);

  const handleCreate = async () => {
    if (!formName.trim() || !formPrompt.trim()) { toast.error('Name and prompt required'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName, prompt: formPrompt, type: formType,
          expectedOutcome: formExpectedOutcome || 'N/A', difficulty: formDifficulty,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Created'); setIsCreateOpen(false); resetForm(); fetchScenarios(); }
      else toast.error(data.error || 'Failed');
    } catch { toast.error('Failed to create'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success('Deleted'); fetchScenarios(); }
      else toast.error(data.error || 'Failed');
    } catch { toast.error('Failed to delete'); }
  };

  const resetForm = () => {
    setFormName(''); setFormPrompt(''); setFormType('task-completion');
    setFormExpectedOutcome(''); setFormDifficulty('medium');
  };

  const filtered = scenarios.filter((s) => {
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (filterDifficulty !== 'all' && s.difficulty !== filterDifficulty) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.prompt.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Prompts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-metric">{scenarios.length}</span> scenarios
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Create Prompt</DialogTitle>
              <DialogDescription>Add an evaluation scenario.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name" className="text-xs">Name</Label>
                <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Restaurant Booking" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="prompt" className="text-xs">Prompt Text</Label>
                <textarea
                  id="prompt"
                  className="flex min-h-[80px] w-full rounded border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="What should the user say to the AI agent?"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task-completion">Task Completion</SelectItem>
                      <SelectItem value="information-retrieval">Info Retrieval</SelectItem>
                      <SelectItem value="conversation-flow">Conversation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Difficulty</Label>
                  <Select value={formDifficulty} onValueChange={setFormDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="expected" className="text-xs">Expected Outcome</Label>
                <Input id="expected" value={formExpectedOutcome} onChange={(e) => setFormExpectedOutcome(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-[240px] h-8 text-sm"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="task-completion">Task</SelectItem>
            <SelectItem value="information-retrieval">Info Retrieval</SelectItem>
            <SelectItem value="conversation-flow">Conversation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          {scenarios.length === 0 ? 'No prompts. Create one above.' : 'No matches.'}
        </div>
      ) : (
        <div className="border rounded">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Name</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9 w-[80px]">Type</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9">Prompt</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-9 w-[70px]">Diff</TableHead>
                <TableHead className="h-9 w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell className="text-sm font-medium py-2">{s.name}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-[11px] font-normal px-1.5 py-0">
                      {typeLabels[s.type] || s.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[360px] truncate text-sm text-muted-foreground py-2">
                    {s.prompt}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`text-[11px] font-metric ${
                      s.difficulty === 'easy' ? 'text-green-400' :
                      s.difficulty === 'hard' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {s.difficulty}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
