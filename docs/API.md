# API Reference

Complete documentation for VoiceBench v2 REST API.

## Base URL

```
http://localhost:3000/api
```

## Response Format

All endpoints return JSON with this structure:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }  // Optional pagination/metadata
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }  // Optional validation details
}
```

---

## Providers

Manage voice AI provider configurations.

### List Providers

Get all providers with their ratings.

```
GET /api/providers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "GPT-4o Nova",
      "type": "openai",
      "config": {
        "model": "gpt-4o",
        "voiceId": "nova"
      },
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "ratings": {
        "general": { "elo": 1523, "matchCount": 45 },
        "customer-support": { "elo": 1489, "matchCount": 23 }
      }
    }
  ]
}
```

> **Note:** API keys are never returned in responses.

---

### Create Provider

Add a new voice AI provider.

```
POST /api/providers
```

**Request Body:**
```json
{
  "name": "GPT-4o Nova",
  "type": "openai",
  "config": {
    "apiKey": "sk-...",
    "model": "gpt-4o",
    "voiceId": "nova"
  },
  "isActive": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name (1-100 chars) |
| `type` | enum | Yes | `openai`, `gemini`, `elevenlabs`, `custom` |
| `config` | object | Yes | Provider configuration |
| `config.apiKey` | string | No | API authentication key |
| `config.endpoint` | string | No | Custom API endpoint URL |
| `config.model` | string | No | Model identifier |
| `config.voiceId` | string | No | Voice/speaker ID |
| `isActive` | boolean | No | Whether provider is active (default: true) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "GPT-4o Nova",
    "type": "openai",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Validation failed

---

### Get Provider

Get a single provider by ID.

```
GET /api/providers/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "GPT-4o Nova",
    "type": "openai",
    "config": {
      "model": "gpt-4o",
      "voiceId": "nova"
    },
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "ratings": { ... }
  }
}
```

**Errors:**
- `400` - Invalid provider ID
- `404` - Provider not found

---

### Update Provider

Update an existing provider.

```
PUT /api/providers/:id
```

**Request Body:**
```json
{
  "name": "GPT-4o Alloy",
  "config": {
    "voiceId": "alloy"
  },
  "isActive": false
}
```

All fields are optional. Only provided fields are updated.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "GPT-4o Alloy",
    "type": "openai",
    "config": { ... },
    "isActive": false,
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid ID or validation failed
- `404` - Provider not found

---

### Delete Provider

Delete a provider and its ratings.

```
DELETE /api/providers/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Provider deleted successfully"
}
```

**Errors:**
- `400` - Invalid provider ID
- `404` - Provider not found

---

### Test Provider

Run a health check on a provider.

```
POST /api/providers/:id/test
```

**Response (200 - Healthy):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "available": true,
    "responseTimeMs": 234,
    "timestamp": "2024-01-15T10:00:00.000Z",
    "details": {
      "model": "gpt-4o",
      "voice": "nova"
    }
  }
}
```

**Response (503 - Unhealthy):**
```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "available": false,
    "responseTimeMs": 5023,
    "timestamp": "2024-01-15T10:00:00.000Z",
    "error": "Authentication failed"
  }
}
```

---

## Scenarios

Manage evaluation scenarios.

### List Scenarios

Get all scenarios with optional filtering.

```
GET /api/scenarios
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter by scenario type |
| `difficulty` | string | Filter by difficulty |
| `language` | string | Filter by language code |

**Example:**
```
GET /api/scenarios?type=task-completion&difficulty=medium
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-restaurant",
      "name": "Restaurant Reservation",
      "type": "task-completion",
      "prompt": "I'd like to book a table for two...",
      "expectedOutcome": "Assistant confirms booking details...",
      "promptAudioUrl": null,
      "tags": ["booking", "restaurant"],
      "language": "en",
      "difficulty": "medium",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "filters": {
      "type": "task-completion",
      "difficulty": "medium",
      "language": null
    }
  }
}
```

---

### Create Scenario

Create a single scenario.

```
POST /api/scenarios
```

**Request Body:**
```json
{
  "id": "greeting-basic",
  "name": "Basic Greeting",
  "type": "task-completion",
  "prompt": "Hello, how are you today?",
  "expectedOutcome": "A friendly greeting response",
  "promptAudioUrl": "/audio/prompts/greeting.wav",
  "tags": ["greeting", "simple"],
  "language": "en",
  "difficulty": "easy"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | No | Unique ID (auto-generated if not provided) |
| `name` | string | Yes | Display name (1-255 chars) |
| `type` | enum | Yes | `task-completion`, `information-retrieval`, `conversation-flow` |
| `prompt` | string | Yes | The prompt text |
| `expectedOutcome` | string | Yes | Expected response description |
| `promptAudioUrl` | string | No | URL to audio prompt |
| `tags` | string[] | No | Tags for filtering |
| `language` | string | No | Language code (default: "en") |
| `difficulty` | enum | No | `easy`, `medium`, `hard` (default: "medium") |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "greeting-basic",
    "name": "Basic Greeting",
    "type": "task-completion",
    "prompt": "Hello, how are you today?",
    "expectedOutcome": "A friendly greeting response",
    "promptAudioUrl": "/audio/prompts/greeting.wav",
    "tags": ["greeting", "simple"],
    "language": "en",
    "difficulty": "easy",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Validation failed
- `409` - Scenario ID already exists

---

### Import Scenarios from YAML

Bulk import scenarios from YAML content.

```
POST /api/scenarios/import
```

**Request Body:**
```json
{
  "yaml": "version: \"1.0\"\nscenarios:\n  - id: test-1\n    name: Test\n    type: task-completion\n    prompt: Hello\n    expected_outcome: Response",
  "mode": "skip"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `yaml` | string | Yes | YAML content string |
| `mode` | enum | No | `skip` (default), `update`, `fail` |

**Import Modes:**
- `skip` - Skip scenarios with existing IDs
- `update` - Update existing scenarios
- `fail` - Fail if any ID exists

**Response (201):**
```json
{
  "success": true,
  "data": {
    "imported": ["test-1", "test-2"],
    "updated": [],
    "skipped": ["existing-1"],
    "scenarios": [{ ... }, { ... }]
  },
  "meta": {
    "totalParsed": 3,
    "totalImported": 2,
    "totalUpdated": 0,
    "totalSkipped": 1
  }
}
```

**Errors:**
- `400` - Invalid YAML or validation failed
- `409` - Existing IDs (when mode is "fail")

**Validation Error Response:**
```json
{
  "success": false,
  "error": "YAML validation failed",
  "details": [
    {
      "path": "scenarios[0].id",
      "message": "id must be lowercase alphanumeric with hyphens only",
      "line": 3,
      "column": 5
    }
  ]
}
```

---

## Evaluation Runs

Manage automated evaluation runs.

### List Eval Runs

Get all evaluation runs.

```
GET /api/eval/runs
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Weekly Benchmark",
      "providerIds": ["1", "2", "3"],
      "scenarioIds": ["booking-1", "support-1"],
      "status": "completed",
      "progress": 100,
      "startedAt": "2024-01-15T10:00:00.000Z",
      "completedAt": "2024-01-15T10:15:00.000Z",
      "createdAt": "2024-01-15T09:59:00.000Z"
    }
  ]
}
```

**Status Values:**
- `pending` - Run created, not started
- `running` - Currently executing
- `completed` - All scenarios processed
- `failed` - Run encountered fatal error

---

### Create Eval Run

Create and start a new evaluation run.

```
POST /api/eval/runs
```

**Request Body:**
```json
{
  "name": "Weekly Benchmark",
  "providerIds": ["1", "2", "3"],
  "scenarioIds": ["booking-1", "booking-2", "support-1"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Run name (1-255 chars) |
| `providerIds` | string[] | Yes | Provider IDs to evaluate |
| `scenarioIds` | string[] | Yes | Scenario IDs to test |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Weekly Benchmark",
    "providerIds": ["1", "2", "3"],
    "scenarioIds": ["booking-1", "booking-2", "support-1"],
    "status": "pending",
    "progress": 0,
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "message": "Evaluation run created and started"
}
```

> **Note:** Execution starts in background. Poll the detail endpoint for progress.

**Errors:**
- `400` - Validation failed

---

### Get Eval Run Details

Get run details with results and aggregated metrics.

```
GET /api/eval/runs/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "run": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Weekly Benchmark",
      "status": "completed",
      "progress": 100,
      ...
    },
    "results": [
      {
        "id": "result-uuid",
        "runId": "550e8400-e29b-41d4-a716-446655440000",
        "scenarioId": "booking-1",
        "providerId": "1",
        "audioUrl": "/audio/evals/run-id/booking-1-1.mp3",
        "transcript": "I'd be happy to help you book a table...",
        "ttfb": 1234,
        "totalResponseTime": 3456,
        "wer": 0.15,
        "accuracyScore": 0.85,
        "helpfulnessScore": 0.90,
        "naturalnessScore": 0.88,
        "efficiencyScore": 0.82,
        "judgeReasoning": "The response correctly addresses...",
        "taskCompleted": true,
        "createdAt": "2024-01-15T10:01:00.000Z"
      }
    ],
    "aggregates": {
      "overall": {
        "ttfb": {
          "mean": 1150,
          "median": 1100,
          "p95": 1800,
          "stdDev": 250,
          "min": 800,
          "max": 2100,
          "count": 9
        },
        "totalResponseTime": { ... },
        "wer": { ... },
        "accuracyScore": { ... },
        "helpfulnessScore": { ... },
        "naturalnessScore": { ... },
        "efficiencyScore": { ... },
        "taskCompletion": {
          "completed": 8,
          "total": 9,
          "rate": 88.9
        }
      },
      "byProvider": {
        "1": {
          "ttfb": { ... },
          "accuracyScore": { ... },
          ...
        },
        "2": { ... }
      }
    }
  }
}
```

**Errors:**
- `404` - Run not found

---

### Export Eval Run

Export results as JSON or CSV.

```
GET /api/eval/runs/:id/export?format=csv
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | enum | `json` | `json` or `csv` |

**JSON Response:**
Returns file download with `Content-Disposition: attachment`.

```json
{
  "run": { ... },
  "results": [ ... ]
}
```

**CSV Response:**
```csv
id,runId,scenarioId,scenarioName,scenarioType,providerId,audioUrl,transcript,ttfb,totalResponseTime,wer,accuracyScore,helpfulnessScore,naturalnessScore,efficiencyScore,taskCompleted,judgeReasoning,createdAt
result-1,run-1,booking-1,Restaurant Booking,task-completion,1,/audio/...,Hello...,1234,3456,0.15,0.85,0.90,0.88,0.82,true,"Good response",2024-01-15T10:00:00.000Z
```

**Errors:**
- `400` - Invalid format
- `404` - Run not found

---

## Arena

Blind A/B comparison with Elo rankings.

### Generate Match

Create a new match between two providers.

```
POST /api/arena/match
```

**Request Body:**
```json
{
  "category": "general",
  "timeoutMs": 30000
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | enum | `general` | Match category |
| `timeoutMs` | number | `30000` | Provider timeout (1000-120000ms) |

**Categories:**
- `general`
- `customer-support`
- `information-retrieval`
- `creative`
- `multilingual`

**Response (201):**
```json
{
  "matchId": "match-uuid",
  "prompt": {
    "id": "prompt-1",
    "text": "Hello, how can I help you today?",
    "category": "general",
    "audioUrl": "/audio/prompts/greeting.wav"
  },
  "responseA": {
    "url": "/audio/matches/match-uuid-a.mp3",
    "latencyMs": 1234
  },
  "responseB": {
    "url": "/audio/matches/match-uuid-b.mp3",
    "latencyMs": 1456
  },
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Mock Match Response (Demo Mode):**

When no providers are configured:
```json
{
  "matchId": "mock-uuid",
  "prompt": { ... },
  "responseA": { ... },
  "responseB": { ... },
  "isMock": true,
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Errors:**
- `400` - Invalid category or timeout
- `404` - No prompts available
- `502` - Provider failure
- `503` - No providers configured

---

### Submit Vote

Record a vote and update Elo ratings.

```
POST /api/arena/vote
```

**Request Body:**
```json
{
  "matchId": "match-uuid",
  "winner": "A",
  "sessionId": "optional-session-id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `matchId` | string | Yes | Match ID to vote on |
| `winner` | enum | Yes | `A`, `B`, or `tie` |
| `sessionId` | string | No | Session ID for deduplication |

**Response (201):**
```json
{
  "success": true,
  "voteId": "vote-uuid",
  "matchId": "match-uuid",
  "winner": "A",
  "providerA": {
    "name": "GPT-4o Nova",
    "oldElo": 1500,
    "newElo": 1516
  },
  "providerB": {
    "name": "Gemini Pro",
    "oldElo": 1500,
    "newElo": 1484
  },
  "category": "general"
}
```

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
```

**Errors:**
- `400` - Invalid request body or winner
- `404` - Match not found
- `409` - Match already voted on or duplicate vote
- `410` - Match expired
- `429` - Rate limit exceeded (10 votes/minute)

---

### Get Leaderboard

Get provider rankings with Elo scores.

```
GET /api/arena/leaderboard
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | `overall` | Filter by category |

**Categories:**
- `overall` - Aggregate across all categories
- `general`
- `customer-support`
- `information-retrieval`
- `creative`
- `multilingual`

**Response:**
```json
{
  "rankings": [
    {
      "rank": 1,
      "providerId": 1,
      "providerName": "GPT-4o Nova",
      "elo": 1567,
      "matchCount": 156,
      "winRate": 0.65,
      "confidence": {
        "lower": 1504,
        "upper": 1630
      }
    },
    {
      "rank": 2,
      "providerId": 2,
      "providerName": "Gemini Pro",
      "elo": 1489,
      "matchCount": 142,
      "winRate": 0.48,
      "confidence": {
        "lower": 1423,
        "upper": 1555
      }
    }
  ]
}
```

> **Note:** Confidence intervals only shown when `matchCount > 30`.

**Cache Headers:**
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=30
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid input |
| `404` | Not Found - Resource doesn't exist |
| `409` | Conflict - Duplicate or already exists |
| `410` | Gone - Resource expired |
| `429` | Too Many Requests - Rate limited |
| `500` | Internal Server Error |
| `502` | Bad Gateway - Provider error |
| `503` | Service Unavailable - No providers |

### Error Response Structure

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field1": ["Error for field1"],
    "field2": ["Error for field2"]
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_BODY` | Request body parsing failed |
| `VALIDATION_FAILED` | Input validation failed |
| `NOT_FOUND` | Resource not found |
| `ALREADY_EXISTS` | Resource already exists |
| `ALREADY_VOTED` | Match already voted on |
| `DUPLICATE_VOTE` | Session already voted on match |
| `MATCH_EXPIRED` | Match has expired |
| `RATE_LIMITED` | Too many requests |
| `NO_PROVIDERS` | No providers configured |
| `NO_PROMPTS` | No prompts for category |
| `PROVIDER_FAILURE` | Provider API error |
| `INTERNAL_ERROR` | Server error |

---

## Rate Limits

### Vote Endpoint

- **Limit:** 10 votes per minute per session
- **Window:** 60 seconds
- **Identification:** Session ID (provided or derived from IP + User-Agent)

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1705312860
Retry-After: 60
```

---

## Examples

### cURL Examples

**Create provider:**
```bash
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI GPT-4o",
    "type": "openai",
    "config": {
      "apiKey": "sk-...",
      "model": "gpt-4o",
      "voiceId": "nova"
    }
  }'
```

**Import scenarios:**
```bash
curl -X POST http://localhost:3000/api/scenarios/import \
  -H "Content-Type: application/json" \
  -d '{
    "yaml": "'"$(cat scenarios.yaml)"'",
    "mode": "update"
  }'
```

**Start evaluation:**
```bash
curl -X POST http://localhost:3000/api/eval/runs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Benchmark",
    "providerIds": ["1", "2"],
    "scenarioIds": ["greeting-1", "booking-1"]
  }'
```

**Poll evaluation status:**
```bash
curl http://localhost:3000/api/eval/runs/run-uuid
```

**Export results:**
```bash
curl -o results.csv "http://localhost:3000/api/eval/runs/run-uuid/export?format=csv"
```

**Generate arena match:**
```bash
curl -X POST http://localhost:3000/api/arena/match \
  -H "Content-Type: application/json" \
  -d '{"category": "customer-support"}'
```

**Submit vote:**
```bash
curl -X POST http://localhost:3000/api/arena/vote \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "match-uuid",
    "winner": "A"
  }'
```

**Get leaderboard:**
```bash
curl "http://localhost:3000/api/arena/leaderboard?category=general"
```

### JavaScript/TypeScript Examples

```typescript
// Using fetch
const response = await fetch('/api/providers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'OpenAI GPT-4o',
    type: 'openai',
    config: { apiKey: 'sk-...', model: 'gpt-4o', voiceId: 'nova' },
  }),
});

const data = await response.json();

// Using SWR for data fetching
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((r) => r.json());

function Leaderboard() {
  const { data, error } = useSWR('/api/arena/leaderboard', fetcher);
  
  if (error) return <div>Failed to load</div>;
  if (!data) return <div>Loading...</div>;
  
  return (
    <table>
      {data.rankings.map((r) => (
        <tr key={r.providerId}>
          <td>{r.rank}</td>
          <td>{r.providerName}</td>
          <td>{r.elo}</td>
        </tr>
      ))}
    </table>
  );
}
```
