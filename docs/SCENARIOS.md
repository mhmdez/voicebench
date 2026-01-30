# Scenario YAML Schema

This document describes the YAML schema for defining evaluation scenarios in VoiceBench.

## Overview

Scenarios are evaluation test cases that define:
- What prompt to send to voice AI providers
- What outcome to expect
- How to categorize and filter scenarios

Scenarios can be created individually via API or imported in bulk from YAML files.

## Quick Example

```yaml
version: "1.0"
scenarios:
  - id: booking-restaurant
    name: Restaurant Reservation
    type: task-completion
    prompt: "I'd like to book a table for two at an Italian restaurant tonight at 7pm."
    expected_outcome: "Assistant confirms booking details and asks for contact information or confirms reservation"
    tags:
      - booking
      - restaurant
    difficulty: medium
    language: en
```

## Schema Reference

### Document Structure

A YAML document can contain either:
1. Multiple scenarios with a `scenarios` array
2. A single scenario object (no wrapper)

**Multiple Scenarios:**

```yaml
version: "1.0"  # Optional version string
scenarios:
  - id: scenario-1
    # ... fields
  - id: scenario-2
    # ... fields
```

**Single Scenario:**

```yaml
id: standalone-scenario
name: Standalone Test
type: task-completion
prompt: "Hello"
expected_outcome: "Greeting response"
```

### Scenario Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | Yes | - | Unique identifier (lowercase alphanumeric with hyphens) |
| `name` | string | Yes | - | Human-readable display name (max 255 chars) |
| `type` | enum | Yes | - | Scenario type (see below) |
| `prompt` | string | Yes | - | The text prompt to send to providers |
| `expected_outcome` | string | Yes | - | Description of expected response |
| `prompt_audio_url` | string | No | null | URL to pre-recorded audio prompt |
| `tags` | string[] | No | [] | Tags for filtering and categorization |
| `language` | string | No | "en" | Language code (2-10 chars) |
| `difficulty` | enum | No | "medium" | Difficulty level |

### Scenario Types

| Type | Description | Use Case |
|------|-------------|----------|
| `task-completion` | Action-oriented scenarios | Bookings, orders, settings changes |
| `information-retrieval` | Question-answering scenarios | Factual queries, lookups, explanations |
| `conversation-flow` | Multi-turn dialogue scenarios | Customer support, counseling |

### Difficulty Levels

| Level | Description |
|-------|-------------|
| `easy` | Simple, single-intent requests |
| `medium` | Moderate complexity, some ambiguity |
| `hard` | Complex multi-part requests, edge cases |

### ID Format

IDs must match the pattern: `^[a-z0-9-]+$`

✅ Valid IDs:
- `greeting-basic`
- `book-flight-123`
- `multilingual-es-01`

❌ Invalid IDs:
- `Greeting_Basic` (uppercase, underscores)
- `book flight` (spaces)
- `café-order` (special characters)

## Complete Examples

### Task Completion Scenarios

```yaml
version: "1.0"
scenarios:
  # Simple booking
  - id: hotel-booking-simple
    name: Simple Hotel Booking
    type: task-completion
    prompt: "Book me a hotel room in New York for next Friday night."
    expected_outcome: "Assistant asks clarifying questions (hotel preferences, budget, location) or confirms booking details"
    tags:
      - booking
      - hotel
      - travel
    difficulty: easy
    language: en

  # Complex multi-part task
  - id: travel-plan-complex
    name: Complex Travel Planning
    type: task-completion
    prompt: "I need to plan a trip to Tokyo. Book flights departing December 15th, returning December 22nd. Also find a hotel near Shibuya station, and recommend some restaurants."
    expected_outcome: "Assistant breaks down the request, handles each component (flights, hotel, restaurants), and provides organized recommendations or booking confirmations"
    tags:
      - travel
      - booking
      - multi-part
    difficulty: hard
    language: en

  # E-commerce
  - id: order-pizza-delivery
    name: Pizza Delivery Order
    type: task-completion
    prompt: "Order a large pepperoni pizza with extra cheese for delivery to 123 Main Street."
    expected_outcome: "Assistant confirms order details, asks about sides/drinks, provides estimated delivery time"
    tags:
      - food
      - ordering
    difficulty: easy
    language: en
```

### Information Retrieval Scenarios

```yaml
version: "1.0"
scenarios:
  # Factual question
  - id: weather-query-basic
    name: Basic Weather Query
    type: information-retrieval
    prompt: "What's the weather forecast for San Francisco this weekend?"
    expected_outcome: "Provides weather information including temperature, conditions, and any notable weather events"
    tags:
      - weather
      - factual
    difficulty: easy
    language: en

  # Technical explanation
  - id: explain-machine-learning
    name: ML Explanation
    type: information-retrieval
    prompt: "Can you explain how machine learning works in simple terms?"
    expected_outcome: "Clear, accessible explanation of machine learning concepts without excessive jargon"
    tags:
      - technical
      - explanation
      - education
    difficulty: medium
    language: en

  # Comparison query
  - id: compare-cloud-providers
    name: Cloud Provider Comparison
    type: information-retrieval
    prompt: "What are the main differences between AWS, Google Cloud, and Azure?"
    expected_outcome: "Balanced comparison covering pricing, features, strengths, and use cases for each provider"
    tags:
      - technology
      - comparison
    difficulty: medium
    language: en
```

### Conversation Flow Scenarios

```yaml
version: "1.0"
scenarios:
  # Customer support
  - id: customer-support-refund
    name: Refund Request Support
    type: conversation-flow
    prompt: "I received a damaged product and I want a refund. The order number is 12345."
    expected_outcome: "Empathetic response, acknowledgment of the issue, clear next steps for refund process, offer of alternatives if appropriate"
    tags:
      - support
      - refund
      - complaint
    difficulty: medium
    language: en

  # Technical support
  - id: tech-support-wifi
    name: WiFi Troubleshooting
    type: conversation-flow
    prompt: "My WiFi keeps disconnecting every few minutes. I've already tried restarting my router."
    expected_outcome: "Systematic troubleshooting approach, asks relevant diagnostic questions, provides step-by-step solutions"
    tags:
      - support
      - technical
      - networking
    difficulty: medium
    language: en

  # Emotional support
  - id: emotional-support-stress
    name: Work Stress Conversation
    type: conversation-flow
    prompt: "I've been really stressed at work lately. My boss keeps piling on tasks and I don't know how to say no."
    expected_outcome: "Empathetic, supportive response. Validates feelings, asks clarifying questions, offers practical coping strategies"
    tags:
      - emotional
      - support
      - workplace
    difficulty: hard
    language: en
```

### Multilingual Scenarios

```yaml
version: "1.0"
scenarios:
  # Spanish
  - id: greeting-spanish
    name: Spanish Greeting
    type: task-completion
    prompt: "Buenos días, ¿cómo puedo ayudarte hoy?"
    expected_outcome: "Appropriate Spanish greeting and offer of assistance"
    tags:
      - greeting
      - multilingual
    difficulty: easy
    language: es

  # Arabic
  - id: greeting-arabic
    name: Arabic Greeting
    type: task-completion
    prompt: "مرحباً، كيف يمكنني مساعدتك؟"
    expected_outcome: "Appropriate Arabic greeting and polite response"
    tags:
      - greeting
      - multilingual
    difficulty: easy
    language: ar

  # Japanese
  - id: restaurant-booking-jp
    name: Japanese Restaurant Booking
    type: task-completion
    prompt: "今夜7時に2名でレストランを予約したいのですが。"
    expected_outcome: "Polite confirmation in Japanese, asks for restaurant preferences or confirms booking"
    tags:
      - booking
      - restaurant
      - multilingual
    difficulty: medium
    language: ja

  # Mixed language
  - id: code-switch-spanglish
    name: Spanglish Code Switching
    type: conversation-flow
    prompt: "Hey, necesito help con mi order. I ordered something pero nunca arrived."
    expected_outcome: "Naturally handles code-switching, responds appropriately in either language or both"
    tags:
      - multilingual
      - support
      - code-switching
    difficulty: hard
    language: en
```

### Scenarios with Audio Prompts

```yaml
version: "1.0"
scenarios:
  - id: audio-greeting-test
    name: Audio Greeting Test
    type: task-completion
    prompt: "Hello, how are you doing today?"
    expected_outcome: "Friendly greeting response"
    prompt_audio_url: /audio/prompts/greeting.wav
    tags:
      - greeting
      - audio-test
    difficulty: easy
    language: en

  - id: noisy-environment
    name: Noisy Environment Test
    type: task-completion
    prompt: "I'd like to order a coffee please."
    expected_outcome: "Correct interpretation despite background noise, appropriate coffee order response"
    prompt_audio_url: /audio/prompts/noisy-coffee-order.wav
    tags:
      - robustness
      - noise
    difficulty: hard
    language: en
```

## Import Modes

When importing scenarios via the API, specify a mode for handling existing IDs:

| Mode | Behavior |
|------|----------|
| `skip` | Skip scenarios with existing IDs (default) |
| `update` | Update existing scenarios with new values |
| `fail` | Fail the entire import if any ID exists |

### Import API Example

```bash
# Import with skip mode (default)
curl -X POST http://localhost:3000/api/scenarios/import \
  -H "Content-Type: application/json" \
  -d '{
    "yaml": "version: \"1.0\"\nscenarios:\n  - id: test-1\n    name: Test\n    type: task-completion\n    prompt: Hello\n    expected_outcome: Response",
    "mode": "skip"
  }'

# Response
{
  "success": true,
  "data": {
    "imported": ["test-1"],
    "updated": [],
    "skipped": [],
    "scenarios": [{ ... }]
  },
  "meta": {
    "totalParsed": 1,
    "totalImported": 1,
    "totalUpdated": 0,
    "totalSkipped": 0
  }
}
```

## Validation Errors

The parser provides detailed error messages with line numbers:

```bash
# Invalid YAML
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

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "id is required" | Missing `id` field | Add unique ID |
| "id must be lowercase..." | Invalid ID format | Use only `a-z`, `0-9`, `-` |
| "name is required" | Missing `name` | Add display name |
| "prompt is required" | Missing `prompt` | Add prompt text |
| "expected_outcome is required" | Missing outcome | Add expected outcome |
| "Invalid type" | Unknown scenario type | Use valid type enum |
| "Invalid difficulty" | Unknown difficulty | Use: easy, medium, hard |

## Best Practices

### ID Naming

```yaml
# Good: Descriptive, hierarchical
- id: booking-flight-oneway
- id: support-billing-refund
- id: info-weather-forecast

# Bad: Vague, inconsistent
- id: test1
- id: my_scenario
- id: BOOKING
```

### Prompts

- **Be Natural**: Write prompts as a real user would speak
- **Include Context**: Add relevant details when needed
- **Vary Complexity**: Mix simple and complex requests
- **Test Edge Cases**: Include ambiguous or challenging prompts

### Expected Outcomes

- **Be Specific**: Describe concrete behaviors to check
- **Allow Flexibility**: Don't require exact wording
- **Include Key Points**: List must-have elements
- **Consider Tone**: Note if empathy/formality matters

### Tags

```yaml
# Use consistent, hierarchical tags
tags:
  - domain:travel
  - task:booking
  - complexity:multi-step

# Or simple flat tags
tags:
  - booking
  - travel
  - urgent
```

## File Organization

Recommended structure for scenario files:

```
scenarios/
├── task-completion/
│   ├── booking.yaml
│   ├── ordering.yaml
│   └── settings.yaml
├── information-retrieval/
│   ├── factual.yaml
│   ├── technical.yaml
│   └── comparison.yaml
├── conversation-flow/
│   ├── customer-support.yaml
│   ├── technical-support.yaml
│   └── emotional-support.yaml
└── multilingual/
    ├── spanish.yaml
    ├── arabic.yaml
    └── japanese.yaml
```

Import all with a script:

```bash
#!/bin/bash
for file in scenarios/**/*.yaml; do
  echo "Importing $file..."
  curl -X POST http://localhost:3000/api/scenarios/import \
    -H "Content-Type: application/json" \
    -d "{\"yaml\": $(cat "$file" | jq -Rs .), \"mode\": \"update\"}"
done
```
