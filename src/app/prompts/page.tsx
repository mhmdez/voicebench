'use client';

import * as React from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
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

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const typeLabels: Record<string, string> = {
  'task-completion': 'Task',
  'information-retrieval': 'Info',
  'conversation-flow': 'Conversation',
};

export default function PromptsPage() {
  const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [filterType, setFilterType] = React.useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Form state
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
      if (data.success) {
        setScenarios(data.data);
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      toast.error('Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const handleCreate = async () => {
    if (!formName.trim() || !formPrompt.trim()) {
      toast.error('Name and prompt are required');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          prompt: formPrompt,
          type: formType,
          expectedOutcome: formExpectedOutcome || 'N/A',
          difficulty: formDifficulty,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Prompt created');
        setIsCreateOpen(false);
        resetForm();
        fetchScenarios();
      } else {
        toast.error(data.error || 'Failed to create prompt');
      }
    } catch {
      toast.error('Failed to create prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Prompt deleted');
        fetchScenarios();
      } else {
        toast.error(data.error || 'Failed to delete prompt');
      }
    } catch {
      toast.error('Failed to delete prompt');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormPrompt('');
    setFormType('task-completion');
    setFormExpectedOutcome('');
    setFormDifficulty('medium');
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prompts</h1>
            <p className="text-muted-foreground text-sm">
              {scenarios.length} scenarios available
            </p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Prompt</DialogTitle>
              <DialogDescription>
                Add a new evaluation scenario for testing voice AI providers.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Restaurant Booking"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prompt">Prompt Text</Label>
                <textarea
                  id="prompt"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="What should the user say to the AI agent?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task-completion">Task Completion</SelectItem>
                      <SelectItem value="information-retrieval">Information Retrieval</SelectItem>
                      <SelectItem value="conversation-flow">Conversation Flow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Difficulty</Label>
                  <Select value={formDifficulty} onValueChange={setFormDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expected">Expected Outcome (optional)</Label>
                <Input
                  id="expected"
                  value={formExpectedOutcome}
                  onChange={(e) => setFormExpectedOutcome(e.target.value)}
                  placeholder="What a good response looks like"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="task-completion">Task Completion</SelectItem>
            <SelectItem value="information-retrieval">Information Retrieval</SelectItem>
            <SelectItem value="conversation-flow">Conversation Flow</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading prompts...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {scenarios.length === 0 ? 'No prompts yet. Create one to get started.' : 'No prompts match your filters.'}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[100px]">Category</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead className="w-[90px]">Difficulty</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((scenario) => (
                <TableRow key={scenario.id}>
                  <TableCell className="font-medium">{scenario.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[scenario.type] || scenario.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate text-muted-foreground text-sm">
                    {scenario.prompt}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[scenario.difficulty] || ''}`}>
                      {scenario.difficulty}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(scenario.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
