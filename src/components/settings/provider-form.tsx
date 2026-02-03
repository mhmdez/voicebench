'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Provider, ProviderType } from '@/types/provider';

/** Form validation schema */
const providerFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  type: z.enum(['openai', 'gemini', 'elevenlabs', 'retell', 'custom'] as const),
  apiKey: z.string().optional(),
  endpoint: z.string().url('Invalid URL').optional().or(z.literal('')),
  model: z.string().optional(),
  voiceId: z.string().optional(),
  isActive: z.boolean(),
});

type ProviderFormValues = z.infer<typeof providerFormSchema>;

/** Provider type labels for display */
const providerTypeLabels: Record<ProviderType, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  elevenlabs: 'ElevenLabs',
  retell: 'Retell AI',
  custom: 'Custom Provider',
};

/** Props for ProviderForm component */
export interface ProviderFormProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Provider to edit (if editing) */
  provider?: Provider | null;
  /** Callback on successful save */
  onSuccess?: () => void;
}

/**
 * ProviderForm - Dialog form for creating or editing providers
 */
export function ProviderForm({
  open,
  onOpenChange,
  provider,
  onSuccess,
}: ProviderFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const isEditing = !!provider;

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      name: '',
      type: 'openai',
      apiKey: '',
      endpoint: '',
      model: '',
      voiceId: '',
      isActive: true,
    },
  });

  // Reset form when provider changes
  React.useEffect(() => {
    if (provider) {
      form.reset({
        name: provider.name,
        type: provider.type,
        apiKey: '', // Never pre-fill API keys
        endpoint: provider.config.endpoint || '',
        model: provider.config.model || '',
        voiceId: provider.config.voiceId || '',
        isActive: provider.isActive,
      });
    } else {
      form.reset({
        name: '',
        type: 'openai',
        apiKey: '',
        endpoint: '',
        model: '',
        voiceId: '',
        isActive: true,
      });
    }
  }, [provider, form]);

  const watchType = form.watch('type');

  async function onSubmit(data: ProviderFormValues) {
    setIsSubmitting(true);
    try {
      const config: Record<string, unknown> = {};
      if (data.apiKey) config.apiKey = data.apiKey;
      if (data.endpoint) config.endpoint = data.endpoint;
      if (data.model) config.model = data.model;
      if (data.voiceId) config.voiceId = data.voiceId;

      const payload = {
        name: data.name,
        type: data.type,
        config,
        isActive: data.isActive,
      };

      const url = isEditing
        ? `/api/providers/${provider.id}`
        : '/api/providers';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save provider');
      }

      toast.success(isEditing ? 'Provider updated' : 'Provider created');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving provider:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save provider'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTestConnection() {
    if (!provider) {
      toast.error('Save the provider first to test connection');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`/api/providers/${provider.id}/test`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success && result.data?.available) {
        toast.success(
          `Connection successful! Response time: ${result.data.responseTimeMs}ms`
        );
      } else {
        toast.error(result.data?.error || 'Connection failed');
      }
    } catch (error) {
      console.error('Error testing provider:', error);
      toast.error('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Provider' : 'Add Provider'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update provider configuration. Leave API key empty to keep existing.'
              : 'Configure a new voice/AI provider for benchmarking.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My OpenAI Provider" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a provider type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(providerTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* API Key */}
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isEditing ? '••••••••' : 'sk-...'}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {isEditing
                      ? 'Leave empty to keep existing key'
                      : 'Your API key will be stored securely'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Model */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        watchType === 'openai'
                          ? 'gpt-4o-realtime-preview'
                          : watchType === 'gemini'
                            ? 'gemini-2.0-flash'
                            : watchType === 'retell'
                              ? 'Agent handles model selection'
                              : 'model-id'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Voice ID (for ElevenLabs, Gemini, Retell) */}
            {(watchType === 'elevenlabs' || watchType === 'gemini' || watchType === 'retell') && (
              <FormField
                control={form.control}
                name="voiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchType === 'retell' ? 'Agent ID' : 'Voice ID'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          watchType === 'retell'
                            ? 'agent_xxx'
                            : watchType === 'gemini'
                              ? 'en-US-Studio-O'
                              : 'voice-id'
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {watchType === 'retell'
                        ? 'Your Retell AI agent ID from the dashboard'
                        : watchType === 'gemini'
                          ? 'Google Cloud TTS voice name'
                          : 'ElevenLabs voice identifier'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Endpoint (for custom providers) */}
            {watchType === 'custom' && (
              <FormField
                control={form.control}
                name="endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Endpoint</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://api.example.com/v1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Active toggle */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Include this provider in benchmarks
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting && <Loader2 className="animate-spin" />}
                  Test Connection
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ProviderForm;
