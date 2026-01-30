'use client';

import * as React from 'react';
import { FlaskConical } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { RunWizard } from '@/components/eval/run-wizard';

/**
 * NewEvalRunPage - Wizard for creating a new evaluation run
 *
 * Multi-step wizard:
 * 1. Name the run + select providers
 * 2. Select scenarios
 * 3. Review and start
 */
export default function NewEvalRunPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-6 w-6" />
            <h1 className="text-xl font-semibold">New Evaluation Run</h1>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/eval">Cancel</Link>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <RunWizard />
      </main>
    </div>
  );
}
