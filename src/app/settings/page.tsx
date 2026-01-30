'use client';

import * as React from 'react';
import { Plus, Settings } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ProviderForm } from '@/components/settings/provider-form';
import { ProviderList } from '@/components/settings/provider-list';
import type { Provider } from '@/types/provider';

/**
 * SettingsPage - Provider configuration and management
 */
export default function SettingsPage() {
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingProvider, setEditingProvider] = React.useState<Provider | null>(
    null
  );

  // Fetch providers
  const fetchProviders = React.useCallback(async () => {
    try {
      const response = await fetch('/api/providers');
      const result = await response.json();

      if (result.success && result.data) {
        setProviders(result.data);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load providers on mount
  React.useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Open form for editing
  function handleEdit(provider: Provider) {
    setEditingProvider(provider);
    setIsFormOpen(true);
  }

  // Open form for creating
  function handleAdd() {
    setEditingProvider(null);
    setIsFormOpen(true);
  }

  // Handle form close
  function handleFormOpenChange(open: boolean) {
    setIsFormOpen(open);
    if (!open) {
      setEditingProvider(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link href="/arena" className="text-sm text-muted-foreground hover:text-foreground">
              Arena
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Providers section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Providers</h2>
              <p className="text-muted-foreground">
                Configure voice and AI providers for benchmarking
              </p>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add Provider
            </Button>
          </div>

          <ProviderList
            providers={providers}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={fetchProviders}
            onToggle={fetchProviders}
          />
        </section>
      </main>

      {/* Provider form dialog */}
      <ProviderForm
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        provider={editingProvider}
        onSuccess={fetchProviders}
      />
    </div>
  );
}
