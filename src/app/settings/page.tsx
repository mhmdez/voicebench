'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ProviderForm } from '@/components/settings/provider-form';
import { ProviderList } from '@/components/settings/provider-list';
import type { Provider } from '@/types/provider';

export default function SettingsPage() {
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingProvider, setEditingProvider] = React.useState<Provider | null>(null);

  const fetchProviders = React.useCallback(async () => {
    try {
      const response = await fetch('/api/providers');
      const result = await response.json();
      if (result.success && result.data) setProviders(result.data);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchProviders(); }, [fetchProviders]);

  function handleEdit(provider: Provider) {
    setEditingProvider(provider);
    setIsFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setIsFormOpen(open);
    if (!open) setEditingProvider(null);
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage voice AI providers and API keys
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditingProvider(null); setIsFormOpen(true); }}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
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

      <ProviderForm
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        provider={editingProvider}
        onSuccess={fetchProviders}
      />
    </div>
  );
}
