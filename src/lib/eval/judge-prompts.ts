/**
 * Judge Prompts
 *
 * Evaluation prompts for LLM-as-judge scoring.
 * Different prompts are used for each scenario type to ensure
 * relevant and accurate evaluation.
 */

import type { ScenarioType } from '@/types/scenario';

/**
 * Base system prompt for the LLM judge
 */
export const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator for voice AI assistants. Your task is to assess the quality of a voice AI's response to a user request.

You will evaluate responses on four dimensions, scoring each from 1-10:

1. **Accuracy** (1-10): How factually correct and relevant is the response to the user's request?
   - 1-3: Incorrect, irrelevant, or contains significant errors
   - 4-6: Partially correct but with notable gaps or minor errors
   - 7-9: Mostly accurate with minor omissions
   - 10: Completely accurate and directly addresses the request

2. **Helpfulness** (1-10): How well does the response assist the user in achieving their goal?
   - 1-3: Unhelpful or counterproductive
   - 4-6: Somewhat helpful but incomplete
   - 7-9: Very helpful with actionable information
   - 10: Exceptionally helpful, exceeds expectations

3. **Naturalness** (1-10): How natural and conversational does the response sound for voice interaction?
   - 1-3: Robotic, awkward, or inappropriate for voice
   - 4-6: Functional but clearly AI-generated
   - 7-9: Natural and pleasant to listen to
   - 10: Indistinguishable from natural human speech patterns

4. **Efficiency** (1-10): Is the response appropriately concise for voice interaction?
   - 1-3: Far too long/short, wastes user's time
   - 4-6: Acceptable length but could be improved
   - 7-9: Well-paced, appropriate length
   - 10: Perfectly concise, no wasted words

Additionally, determine if the task was completed successfully (true/false).

You MUST respond with a valid JSON object containing your evaluation.`;

/**
 * Task completion scenario evaluation prompt
 */
export const TASK_COMPLETION_PROMPT = `## Scenario Type: Task Completion

This scenario tests the AI's ability to complete a specific user task, such as:
- Setting reminders or alarms
- Making reservations
- Controlling smart home devices
- Sending messages or emails
- Scheduling appointments

### Evaluation Focus:
- **Accuracy**: Did the AI correctly understand and execute the task?
- **Helpfulness**: Did the AI confirm the action and provide relevant details?
- **Naturalness**: Did the response flow naturally in conversation?
- **Efficiency**: Was the confirmation concise but complete?
- **Task Completed**: Was the requested task successfully executed?

### Additional Guidelines:
- A task is "completed" if the AI acknowledged understanding and confirmed (or simulated) execution
- Responses should confirm key details (time, recipient, settings, etc.)
- Over-confirmation or excessive questions should lower efficiency score`;

/**
 * Information retrieval scenario evaluation prompt
 */
export const INFORMATION_RETRIEVAL_PROMPT = `## Scenario Type: Information Retrieval

This scenario tests the AI's ability to provide accurate information, such as:
- Answering factual questions
- Providing definitions or explanations
- Looking up weather, news, or sports scores
- Giving directions or location information
- Explaining concepts or processes

### Evaluation Focus:
- **Accuracy**: Is the information factually correct and up-to-date?
- **Helpfulness**: Does the response fully answer the user's question?
- **Naturalness**: Is complex information presented in an easy-to-follow way?
- **Efficiency**: Is the response appropriately detailed without being overwhelming?
- **Task Completed**: Was the requested information successfully provided?

### Additional Guidelines:
- Prioritize accuracy over completeness - wrong information is worse than incomplete
- For voice, information should be structured for easy listening (not too dense)
- A task is "completed" if the core question was answered`;

/**
 * Conversation flow scenario evaluation prompt
 */
export const CONVERSATION_FLOW_PROMPT = `## Scenario Type: Conversation Flow

This scenario tests the AI's conversational abilities, such as:
- Engaging in natural dialogue
- Handling follow-up questions
- Managing context across turns
- Dealing with ambiguous or unclear requests
- Graceful error recovery

### Evaluation Focus:
- **Accuracy**: Does the AI correctly interpret conversational context?
- **Helpfulness**: Does the AI move the conversation forward productively?
- **Naturalness**: Does the response feel like natural human conversation?
- **Efficiency**: Is the response well-paced for dialogue flow?
- **Task Completed**: Did the AI maintain coherent conversation?

### Additional Guidelines:
- Natural conversation may include appropriate hedging or clarification
- Context retention is crucial - not remembering previous turns is a significant failure
- A task is "completed" if the AI engaged meaningfully with the conversation`;

/**
 * Get the appropriate scenario-specific prompt based on scenario type
 */
export function getScenarioPrompt(scenarioType: ScenarioType): string {
  switch (scenarioType) {
    case 'task-completion':
      return TASK_COMPLETION_PROMPT;
    case 'information-retrieval':
      return INFORMATION_RETRIEVAL_PROMPT;
    case 'conversation-flow':
      return CONVERSATION_FLOW_PROMPT;
    default:
      // Fallback to task completion for unknown types
      return TASK_COMPLETION_PROMPT;
  }
}

/**
 * Build the complete evaluation prompt for a given scenario
 */
export function buildEvaluationPrompt(params: {
  scenarioType: ScenarioType;
  scenarioName: string;
  userPrompt: string;
  expectedOutcome: string;
  aiResponse: string;
}): string {
  const scenarioPrompt = getScenarioPrompt(params.scenarioType);

  return `${scenarioPrompt}

## Evaluation Task

**Scenario Name:** ${params.scenarioName}

**User Request:**
"${params.userPrompt}"

**Expected Outcome:**
${params.expectedOutcome}

**AI Response:**
"${params.aiResponse}"

## Instructions

Evaluate the AI's response based on the criteria above. Consider the expected outcome when determining accuracy and task completion.

Respond with ONLY a JSON object in this exact format:
{
  "accuracy": <number 1-10>,
  "helpfulness": <number 1-10>,
  "naturalness": <number 1-10>,
  "efficiency": <number 1-10>,
  "taskCompleted": <boolean>,
  "reasoning": "<string explaining your scores>"
}`;
}

/**
 * JSON schema for structured output validation
 */
export const JUDGE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    accuracy: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      description: 'Accuracy score from 1-10',
    },
    helpfulness: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      description: 'Helpfulness score from 1-10',
    },
    naturalness: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      description: 'Naturalness score from 1-10',
    },
    efficiency: {
      type: 'number',
      minimum: 1,
      maximum: 10,
      description: 'Efficiency score from 1-10',
    },
    taskCompleted: {
      type: 'boolean',
      description: 'Whether the task was completed successfully',
    },
    reasoning: {
      type: 'string',
      description: 'Explanation of the scores given',
    },
  },
  required: ['accuracy', 'helpfulness', 'naturalness', 'efficiency', 'taskCompleted', 'reasoning'],
  additionalProperties: false,
} as const;
