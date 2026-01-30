'use client';

import * as React from 'react';
import { Loader2, MoreVertical, Pencil, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProviderCard, type HealthStatus } from '@/components/providers/provider-card';
import type { Provider } from '@/types/provider';

/** Props for ProviderList component */
export interface ProviderListProps {
  /** List of providers to display */
  providers: Provider[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when edit is requested */
  onEdit?: (provider: Provider) => void;
  /** Callback when delete succeeds */
  onDelete?: () => void;
  /** Callback when toggle succeeds */
  onToggle?: () => void;
}

/** Provider health status cache */
type HealthCache = Record<number, { status: HealthStatus; loading: boolean }>;

/**
 * ProviderList - Displays a list of providers with management actions
 */
export function ProviderList({
  providers,
  isLoading,
  onEdit,
  onDelete,
  onToggle,
}: ProviderListProps) {
  const [healthCache, setHealthCache] = React.useState<HealthCache>({});
  const [deleteTarget, setDeleteTarget] = React.useState<Provider | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Test provider connection
  async function testProvider(provider: Provider) {
    setHealthCache((prev) => ({
      ...prev,
      [provider.id]: { status: 'unknown', loading: true },
    }));

    try {
      const response = await fetch(`/api/providers/${provider.id}/test`, {
        method: 'POST',
      });
      const result = await response.json();

      const status: HealthStatus =
        result.success && result.data?.available ? 'healthy' : 'unhealthy';

      setHealthCache((prev) => ({
        ...prev,
        [provider.id]: { status, loading: false },
      }));

      if (status === 'healthy') {
        toast.success(`${provider.name}: Connection successful`);
      } else {
        toast.error(`${provider.name}: ${result.data?.error || 'Connection failed'}`);
      }
    } catch (error) {
      console.error('Error testing provider:', error);
      setHealthCache((prev) => ({
        ...prev,
        [provider.id]: { status: 'unhealthy', loading: false },
      }));
      toast.error(`${provider.name}: Failed to test connection`);
    }
  }

  // Toggle provider active state
  async function toggleProvider(provider: Provider) {
    try {
      const response = await fetch(`/api/providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !provider.isActive }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update provider');
      }

      toast.success(
        provider.isActive
          ? `${provider.name} disabled`
          : `${provider.name} enabled`
      );
      onToggle?.();
    } catch (error) {
      console.error('Error toggling provider:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update provider'
      );
    }
  }

  // Delete provider
  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/providers/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete provider');
      }

      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      onDelete?.();
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete provider'
      );
    } finally {
      setIsDeleting(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No providers configured yet.</p>
        <p className="text-sm text-muted-foreground">
          Add a provider to start benchmarking.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => {
          const health = healthCache[provider.id];
          const healthStatus = health?.status || 'unknown';
          const isTestingHealth = health?.loading || false;

          return (
            <div key={provider.id} className="relative group">
              <ProviderCard
                provider={provider}
                healthStatus={healthStatus}
                showToggle
                onActiveChange={() => toggleProvider(provider)}
              />

              {/* Actions dropdown */}
              <div className="absolute top-3 right-12">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => testProvider(provider)}
                      disabled={isTestingHealth}
                    >
                      {isTestingHealth ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="mr-2 h-4 w-4" />
                      )}
                      Test Connection
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(provider)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(provider)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This
              action cannot be undone. All associated ratings and history will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ProviderList;
