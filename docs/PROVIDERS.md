# Provider Adapters

This guide explains how to add new voice AI provider adapters to VoiceBench.

## Overview

Provider adapters are the bridge between VoiceBench and external voice AI services. Each adapter implements a standard interface that handles:

- Sending audio prompts to the provider
- Receiving audio responses
- Measuring latency metrics
- Health checking

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ProviderAdapter                       │
│                   (Abstract Base)                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  + generateResponse(prompt): ProviderResponse     │  │
│  │  + healthCheck(): ProviderHealthCheck             │  │
│  │  + getName(): string                              │  │
│  │  + getType(): ProviderType                        │  │
│  │  # withRetry(operation): T                        │  │
│  │  # createError(message, code): ProviderError      │  │
│  └───────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   OpenAI      │ │    Gemini     │ │    Custom     │
│   Adapter     │ │   Adapter     │ │   Adapter     │
└───────────────┘ └───────────────┘ └───────────────┘
```

## Base Adapter Class

All provider adapters extend `ProviderAdapter`:

```typescript
// src/lib/providers/base-adapter.ts

export abstract class ProviderAdapter {
  protected readonly providerType: ProviderType;
  protected readonly config: ProviderConfig;
  protected readonly timeoutMs: number;
  protected readonly retryAttempts: number;
  protected readonly retryDelayMs: number;
  protected readonly debug: boolean;

  constructor(providerType: ProviderType, options: AdapterOptions) {
    this.providerType = providerType;
    this.config = options.config;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.retryAttempts = options.retryAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.debug = options.debug ?? false;
  }

  // Must implement
  abstract generateResponse(prompt: AudioPrompt): Promise<ProviderResponse>;
  abstract healthCheck(): Promise<ProviderHealthCheck>;
  abstract getName(): string;

  // Inherited utilities
  getType(): ProviderType { ... }
  getConfig(): ProviderConfig { ... }
  isConfigured(): boolean { ... }
  protected log(message: string, data?: unknown): void { ... }
  protected createError(message, code, cause?, retryable?): ProviderError { ... }
  protected withRetry<T>(operation, operationName): Promise<T> { ... }
  protected createLatencyMetrics(startTime, firstByteTime?): LatencyMetrics { ... }
}
```

## Types

### AudioPrompt

Input sent to the provider:

```typescript
interface AudioPrompt {
  /** Audio buffer containing the input audio */
  audioBuffer: Buffer;
  /** MIME type of the audio (e.g., 'audio/wav') */
  mimeType: string;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Number of audio channels */
  channels?: number;
  /** Text transcript of the audio (optional) */
  transcript?: string;
  /** System prompt or context */
  systemPrompt?: string;
  /** Conversation history for multi-turn */
  conversationHistory?: ConversationTurn[];
}
```

### ProviderResponse

Output from the provider:

```typescript
interface ProviderResponse {
  /** Audio buffer containing the response */
  audioBuffer: Buffer;
  /** MIME type of the response audio */
  mimeType: string;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Text transcript of the response */
  transcript?: string;
  /** Latency measurements */
  latency: LatencyMetrics;
  /** Additional metadata */
  metadata: ResponseMetadata;
}

interface LatencyMetrics {
  /** Time to first byte (ms) */
  ttfb: number;
  /** Total response time (ms) */
  total: number;
  /** Audio processing time (optional) */
  audioProcessing?: number;
  /** Model inference time (optional) */
  inference?: number;
  /** TTS time (optional) */
  tts?: number;
}

interface ResponseMetadata {
  /** Model used */
  model?: string;
  /** Voice ID */
  voiceId?: string;
  /** Provider request ID */
  requestId?: string;
  /** Token usage */
  tokenUsage?: TokenUsage;
  /** Whether streamed */
  streamed?: boolean;
  /** Provider-specific data */
  providerSpecific?: Record<string, unknown>;
}
```

### ProviderHealthCheck

Result of connectivity test:

```typescript
interface ProviderHealthCheck {
  /** Overall status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Whether provider is available */
  available: boolean;
  /** Response time in ms */
  responseTimeMs: number;
  /** Timestamp of check */
  timestamp: Date;
  /** Error message if unhealthy */
  error?: string;
  /** Additional details */
  details?: Record<string, unknown>;
}
```

### ProviderError

Custom error class with retry logic:

```typescript
class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerType: ProviderType,
    public readonly code: ProviderErrorCode,
    public readonly cause?: Error,
    public readonly retryable: boolean = false
  ) { ... }
}

type ProviderErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'UNSUPPORTED_FORMAT'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_NOT_FOUND'
  | 'UNKNOWN';
```

## Creating a New Adapter

### Step 1: Define Types

Create provider-specific types:

```typescript
// src/lib/providers/my-provider-types.ts

export interface MyProviderConfig {
  apiKey: string;
  model: string;
  voice: string;
  // Provider-specific options
}

export const MY_PROVIDER_DEFAULTS = {
  model: 'default-model',
  voice: 'default-voice',
};
```

### Step 2: Implement Adapter

```typescript
// src/lib/providers/my-provider-adapter.ts

import { ProviderAdapter } from './base-adapter';
import type {
  AudioPrompt,
  ProviderResponse,
  ProviderHealthCheck,
  AdapterOptions,
} from './types';
import { MyProviderConfig, MY_PROVIDER_DEFAULTS } from './my-provider-types';

export class MyProviderAdapter extends ProviderAdapter {
  private client: MyProviderClient;
  private providerConfig: MyProviderConfig;

  constructor(options: AdapterOptions) {
    super('custom', options);  // or add new type to ProviderType
    
    this.providerConfig = this.parseConfig(options.config);
    this.client = new MyProviderClient({
      apiKey: this.providerConfig.apiKey,
    });
  }

  private parseConfig(config: AdapterOptions['config']): MyProviderConfig {
    if (!config.apiKey) {
      throw this.createError(
        'API key is required',
        'AUTHENTICATION_FAILED'
      );
    }

    return {
      apiKey: config.apiKey,
      model: config.model ?? MY_PROVIDER_DEFAULTS.model,
      voice: config.voiceId ?? MY_PROVIDER_DEFAULTS.voice,
    };
  }

  getName(): string {
    return 'My Provider';
  }

  async generateResponse(prompt: AudioPrompt): Promise<ProviderResponse> {
    const startTime = Date.now();
    let firstByteTime: number | undefined;

    return this.withRetry(async () => {
      this.log('Sending request to provider...');

      // 1. Send audio to provider
      const response = await this.client.processAudio({
        audio: prompt.audioBuffer,
        format: prompt.mimeType,
        model: this.providerConfig.model,
        voice: this.providerConfig.voice,
        context: prompt.systemPrompt,
      });

      firstByteTime = Date.now();

      // 2. Get response audio
      const audioBuffer = Buffer.from(response.audio);
      
      this.log('Response received', { 
        bytes: audioBuffer.length,
        transcript: response.text 
      });

      // 3. Return formatted response
      return {
        audioBuffer,
        mimeType: response.format || 'audio/mp3',
        sampleRate: response.sampleRate || 24000,
        durationMs: this.estimateDuration(audioBuffer),
        transcript: response.text,
        latency: this.createLatencyMetrics(startTime, firstByteTime),
        metadata: {
          model: this.providerConfig.model,
          voiceId: this.providerConfig.voice,
          requestId: response.requestId,
          providerSpecific: {
            processingTime: response.processingMs,
          },
        },
      };
    }, 'generateResponse');
  }

  async healthCheck(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();

    try {
      // Lightweight API call to verify connectivity
      await this.client.ping();

      return {
        status: 'healthy',
        available: true,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date(),
        details: {
          model: this.providerConfig.model,
          voice: this.providerConfig.voice,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        available: false,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private estimateDuration(buffer: Buffer): number {
    // Estimate based on file size and typical bitrate
    return Math.round((buffer.length / 16000) * 1000);
  }
}
```

### Step 3: Register Adapter

Update the adapter factory:

```typescript
// src/lib/providers/index.ts

import { OpenAIRealtimeAdapter } from './openai-realtime-adapter';
import { MyProviderAdapter } from './my-provider-adapter';
import type { ProviderType, AdapterOptions } from './types';
import { ProviderAdapter } from './base-adapter';

export function createAdapter(
  type: ProviderType,
  options: AdapterOptions
): ProviderAdapter {
  switch (type) {
    case 'openai':
      return new OpenAIRealtimeAdapter(options);
    case 'my-provider':  // Add your provider type
      return new MyProviderAdapter(options);
    case 'custom':
      // Handle custom providers
      if (options.config.endpoint?.includes('my-provider.com')) {
        return new MyProviderAdapter(options);
      }
      throw new Error('Custom provider not recognized');
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

// Export types and adapters
export * from './types';
export * from './base-adapter';
export { OpenAIRealtimeAdapter } from './openai-realtime-adapter';
export { MyProviderAdapter } from './my-provider-adapter';
```

### Step 4: Update Provider Types

Add your provider type to the system:

```typescript
// src/types/provider.ts

export type ProviderType = 
  | 'openai' 
  | 'gemini' 
  | 'elevenlabs' 
  | 'my-provider'  // Add here
  | 'custom';
```

### Step 5: Update Database Schema (Optional)

If adding a new provider type enum:

```typescript
// src/db/schema/providers.ts

export const providers = sqliteTable('providers', {
  // ...
  type: text('type', { 
    enum: ['openai', 'gemini', 'elevenlabs', 'my-provider', 'custom'] 
  }).notNull(),
});
```

Run migration:

```bash
npm run db:generate
npm run db:migrate
```

## Reference Implementation: OpenAI

The OpenAI adapter demonstrates a pipeline approach:

```typescript
// Simplified OpenAI adapter flow

async generateResponse(prompt: AudioPrompt): Promise<ProviderResponse> {
  const timing = { transcriptionMs: 0, completionMs: 0, ttsMs: 0 };

  // Step 1: Speech-to-Text (Whisper)
  const transcriptionStart = Date.now();
  const transcript = await this.client.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  });
  timing.transcriptionMs = Date.now() - transcriptionStart;

  // Step 2: LLM Response (GPT-4o)
  const completionStart = Date.now();
  const completion = await this.client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript.text },
    ],
  });
  timing.completionMs = Date.now() - completionStart;

  // Step 3: Text-to-Speech
  const ttsStart = Date.now();
  const speech = await this.client.audio.speech.create({
    model: 'tts-1',
    voice: 'nova',
    input: completion.choices[0].message.content,
  });
  timing.ttsMs = Date.now() - ttsStart;

  return {
    audioBuffer: Buffer.from(await speech.arrayBuffer()),
    mimeType: 'audio/mp3',
    transcript: completion.choices[0].message.content,
    latency: {
      ttfb: timing.transcriptionMs + timing.completionMs,
      total: timing.transcriptionMs + timing.completionMs + timing.ttsMs,
      audioProcessing: timing.transcriptionMs,
      inference: timing.completionMs,
      tts: timing.ttsMs,
    },
    // ...
  };
}
```

## Error Handling

Use `createError()` for consistent error handling:

```typescript
// Authentication error (non-retryable)
throw this.createError(
  'Invalid API key',
  'AUTHENTICATION_FAILED',
  originalError,
  false  // retryable
);

// Rate limit (retryable)
throw this.createError(
  'Rate limit exceeded',
  'RATE_LIMITED',
  originalError,
  true  // retryable
);

// Timeout (retryable)
throw this.createError(
  'Request timed out',
  'TIMEOUT',
  originalError,
  true
);
```

The `withRetry()` helper automatically retries retryable errors:

```typescript
return this.withRetry(async () => {
  // This will be retried up to retryAttempts times
  // if it throws a retryable ProviderError
  const result = await this.riskyOperation();
  return result;
}, 'operationName');
```

## Testing Your Adapter

### Unit Tests

```typescript
import { MyProviderAdapter } from './my-provider-adapter';

describe('MyProviderAdapter', () => {
  it('should generate response', async () => {
    const adapter = new MyProviderAdapter({
      config: { apiKey: 'test-key', model: 'test-model' },
    });

    const prompt = {
      audioBuffer: Buffer.from('test'),
      mimeType: 'audio/wav',
    };

    const response = await adapter.generateResponse(prompt);

    expect(response.audioBuffer).toBeDefined();
    expect(response.latency.total).toBeGreaterThan(0);
  });

  it('should pass health check', async () => {
    const adapter = new MyProviderAdapter({
      config: { apiKey: 'test-key' },
    });

    const health = await adapter.healthCheck();

    expect(health.status).toBe('healthy');
    expect(health.available).toBe(true);
  });
});
```

### Integration Test via API

```bash
# Create provider
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Provider Test",
    "type": "my-provider",
    "config": {
      "apiKey": "your-api-key",
      "model": "test-model"
    }
  }'

# Test health check
curl -X POST http://localhost:3000/api/providers/1/test

# Expected response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "available": true,
    "responseTimeMs": 123,
    "timestamp": "2024-01-15T10:00:00.000Z"
  }
}
```

## Configuration Options

When creating adapters, support these standard options:

```typescript
interface AdapterOptions {
  config: ProviderConfig;      // API keys, model, voice, etc.
  timeoutMs?: number;          // Request timeout (default: 30000)
  retryAttempts?: number;      // Retry count (default: 3)
  retryDelayMs?: number;       // Delay between retries (default: 1000)
  debug?: boolean;             // Enable debug logging (default: false)
}
```

Provider-specific config options:

```typescript
interface ProviderConfig {
  apiKey?: string;             // API authentication
  endpoint?: string;           // Custom API endpoint
  model?: string;              // Model identifier
  voiceId?: string;            // Voice/speaker ID
  [key: string]: unknown;      // Additional options
}
```

## Best Practices

1. **Latency Tracking** - Always measure and report accurate TTFB and total times
2. **Error Classification** - Use appropriate error codes for debugging
3. **Retry Logic** - Mark transient errors as retryable
4. **Logging** - Use `this.log()` for debug output
5. **Config Validation** - Validate required config in constructor
6. **Audio Format** - Document supported input/output formats
7. **Health Checks** - Keep health checks lightweight (<5s)
8. **Transcripts** - Return transcript if provider generates one
