/**
 * Seed Scenarios
 *
 * Pre-built scenario sets for voice AI evaluation.
 */

import type { scenarioTypeValues, scenarioDifficultyValues } from '../schema/scenarios';

type ScenarioType = (typeof scenarioTypeValues)[number];
type Difficulty = (typeof scenarioDifficultyValues)[number];

export interface SeedScenario {
  id: string;
  name: string;
  type: ScenarioType;
  prompt: string;
  expectedOutcome: string;
  tags: string[];
  language: string;
  difficulty: Difficulty;
}

/**
 * Task Completion Scenarios
 * Tests the AI's ability to complete specific tasks
 */
const taskCompletionScenarios: SeedScenario[] = [
  {
    id: 'tc-001',
    name: 'Set Alarm',
    type: 'task-completion',
    prompt: 'Set an alarm for 7:30 AM tomorrow.',
    expectedOutcome: 'Confirms alarm set for 7:30 AM the next day',
    tags: ['alarm', 'time', 'reminder'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'tc-002',
    name: 'Create Calendar Event',
    type: 'task-completion',
    prompt: 'Schedule a meeting with John for next Tuesday at 2 PM.',
    expectedOutcome: 'Confirms meeting scheduled with John on Tuesday at 2 PM',
    tags: ['calendar', 'meeting', 'scheduling'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'tc-003',
    name: 'Send Message',
    type: 'task-completion',
    prompt: 'Send a text message to Mom saying I\'ll be home for dinner.',
    expectedOutcome: 'Confirms message sent to Mom with correct content',
    tags: ['messaging', 'communication'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'tc-004',
    name: 'Unit Conversion',
    type: 'task-completion',
    prompt: 'Convert 150 pounds to kilograms.',
    expectedOutcome: 'Returns approximately 68 kilograms',
    tags: ['math', 'conversion', 'units'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'tc-005',
    name: 'Timer Setup',
    type: 'task-completion',
    prompt: 'Set a timer for 25 minutes for my Pomodoro session.',
    expectedOutcome: 'Confirms 25-minute timer is set',
    tags: ['timer', 'productivity'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'tc-006',
    name: 'Multi-step Calculation',
    type: 'task-completion',
    prompt: 'Calculate 15% tip on a $67.50 bill split three ways.',
    expectedOutcome: 'Returns tip amount and per-person total (approximately $25.87 each)',
    tags: ['math', 'calculation', 'tip'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'tc-007',
    name: 'Recipe Scaling',
    type: 'task-completion',
    prompt: 'I have a recipe that serves 4 but I need to serve 6. The recipe calls for 2 cups of flour. How much flour do I need?',
    expectedOutcome: 'Returns 3 cups of flour',
    tags: ['math', 'cooking', 'scaling'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'tc-008',
    name: 'Time Zone Conversion',
    type: 'task-completion',
    prompt: 'If it\'s 3 PM in New York, what time is it in Tokyo?',
    expectedOutcome: 'Returns correct time in Tokyo (4 AM next day)',
    tags: ['time', 'timezone', 'conversion'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'tc-009',
    name: 'Complex Reminder',
    type: 'task-completion',
    prompt: 'Remind me to take my medication every day at 8 AM and 8 PM for the next week.',
    expectedOutcome: 'Confirms recurring reminder set for medication twice daily',
    tags: ['reminder', 'recurring', 'health'],
    language: 'en',
    difficulty: 'hard',
  },
  {
    id: 'tc-010',
    name: 'Travel Planning',
    type: 'task-completion',
    prompt: 'Plan a road trip from San Francisco to Los Angeles with stops at Santa Cruz and Santa Barbara. What\'s the total distance?',
    expectedOutcome: 'Provides route with approximate total distance (around 450 miles)',
    tags: ['travel', 'navigation', 'planning'],
    language: 'en',
    difficulty: 'hard',
  },
];

/**
 * Information Retrieval Scenarios
 * Tests the AI's ability to find and present information
 */
const informationRetrievalScenarios: SeedScenario[] = [
  {
    id: 'ir-001',
    name: 'Simple Fact',
    type: 'information-retrieval',
    prompt: 'What is the capital of France?',
    expectedOutcome: 'Returns Paris',
    tags: ['geography', 'facts', 'simple'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'ir-002',
    name: 'Historical Date',
    type: 'information-retrieval',
    prompt: 'When did the first moon landing occur?',
    expectedOutcome: 'Returns July 20, 1969',
    tags: ['history', 'space', 'dates'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'ir-003',
    name: 'Scientific Fact',
    type: 'information-retrieval',
    prompt: 'What is the chemical symbol for gold?',
    expectedOutcome: 'Returns Au',
    tags: ['science', 'chemistry', 'simple'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'ir-004',
    name: 'Definition',
    type: 'information-retrieval',
    prompt: 'What is photosynthesis?',
    expectedOutcome: 'Explains the process plants use to convert light into energy',
    tags: ['science', 'biology', 'definition'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'ir-005',
    name: 'Comparison',
    type: 'information-retrieval',
    prompt: 'What is the difference between a virus and bacteria?',
    expectedOutcome: 'Explains key differences in structure, reproduction, and treatment',
    tags: ['science', 'biology', 'comparison'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'ir-006',
    name: 'Process Explanation',
    type: 'information-retrieval',
    prompt: 'How does a combustion engine work?',
    expectedOutcome: 'Explains the four-stroke cycle of internal combustion engines',
    tags: ['engineering', 'automotive', 'process'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'ir-007',
    name: 'Historical Context',
    type: 'information-retrieval',
    prompt: 'What were the main causes of World War I?',
    expectedOutcome: 'Explains militarism, alliances, imperialism, nationalism, and the assassination',
    tags: ['history', 'war', 'causes'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'ir-008',
    name: 'Current Events Context',
    type: 'information-retrieval',
    prompt: 'Explain how cryptocurrency differs from traditional currency.',
    expectedOutcome: 'Explains decentralization, blockchain, and key differences',
    tags: ['finance', 'technology', 'comparison'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'ir-009',
    name: 'Complex Science',
    type: 'information-retrieval',
    prompt: 'Explain the theory of general relativity in simple terms.',
    expectedOutcome: 'Explains gravity as curvature of spacetime in accessible language',
    tags: ['physics', 'theory', 'complex'],
    language: 'en',
    difficulty: 'hard',
  },
  {
    id: 'ir-010',
    name: 'Multi-domain',
    type: 'information-retrieval',
    prompt: 'How does climate change affect global food security?',
    expectedOutcome: 'Explains multiple interconnected factors across climate, agriculture, and economics',
    tags: ['climate', 'agriculture', 'economics', 'complex'],
    language: 'en',
    difficulty: 'hard',
  },
];

/**
 * Conversation Flow Scenarios
 * Tests the AI's ability to maintain natural conversation
 */
const conversationFlowScenarios: SeedScenario[] = [
  {
    id: 'cf-001',
    name: 'Greeting Response',
    type: 'conversation-flow',
    prompt: 'Good morning! How are you today?',
    expectedOutcome: 'Responds with appropriate greeting and engagement',
    tags: ['greeting', 'social', 'simple'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'cf-002',
    name: 'Small Talk',
    type: 'conversation-flow',
    prompt: 'Nice weather we\'re having, isn\'t it?',
    expectedOutcome: 'Engages naturally with weather-related small talk',
    tags: ['small-talk', 'weather', 'social'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'cf-003',
    name: 'Opinion Request',
    type: 'conversation-flow',
    prompt: 'What do you think about remote work?',
    expectedOutcome: 'Provides balanced perspective with acknowledgment of different viewpoints',
    tags: ['opinion', 'work', 'discussion'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'cf-004',
    name: 'Clarification',
    type: 'conversation-flow',
    prompt: 'I want to book something for next Friday... wait, actually make that Saturday.',
    expectedOutcome: 'Acknowledges correction and confirms Saturday',
    tags: ['correction', 'booking', 'clarification'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'cf-005',
    name: 'Context Switching',
    type: 'conversation-flow',
    prompt: 'Before we continue with the recipe, can you quickly tell me what time it is in London?',
    expectedOutcome: 'Handles context switch smoothly and offers to return to previous topic',
    tags: ['context-switch', 'multi-task'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'cf-006',
    name: 'Emotional Support',
    type: 'conversation-flow',
    prompt: 'I\'m feeling really stressed about my job interview tomorrow.',
    expectedOutcome: 'Responds with empathy and offers helpful tips or encouragement',
    tags: ['emotional', 'support', 'empathy'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'cf-007',
    name: 'Disagreement Handling',
    type: 'conversation-flow',
    prompt: 'I don\'t think that\'s correct. Shouldn\'t it be the other way around?',
    expectedOutcome: 'Handles disagreement gracefully, willing to reconsider or explain reasoning',
    tags: ['disagreement', 'correction', 'discussion'],
    language: 'en',
    difficulty: 'medium',
  },
  {
    id: 'cf-008',
    name: 'Humor Recognition',
    type: 'conversation-flow',
    prompt: 'Why did the chicken cross the road? To get to the other side!',
    expectedOutcome: 'Recognizes and responds appropriately to humor',
    tags: ['humor', 'joke', 'social'],
    language: 'en',
    difficulty: 'easy',
  },
  {
    id: 'cf-009',
    name: 'Ambiguous Request',
    type: 'conversation-flow',
    prompt: 'Can you help me with that thing we discussed earlier?',
    expectedOutcome: 'Asks for clarification about which topic or acknowledges lack of context',
    tags: ['ambiguous', 'clarification', 'context'],
    language: 'en',
    difficulty: 'hard',
  },
  {
    id: 'cf-010',
    name: 'Multi-turn Follow-up',
    type: 'conversation-flow',
    prompt: 'And what about the other options you mentioned?',
    expectedOutcome: 'Maintains conversation context and provides follow-up information',
    tags: ['multi-turn', 'context', 'follow-up'],
    language: 'en',
    difficulty: 'hard',
  },
];

/**
 * All seed scenarios combined
 */
export const seedScenarios: SeedScenario[] = [
  ...taskCompletionScenarios,
  ...informationRetrievalScenarios,
  ...conversationFlowScenarios,
];

/**
 * Pre-built scenario sets for quick access
 */
export const scenarioSets = {
  /** All task completion scenarios */
  taskCompletion: taskCompletionScenarios,

  /** All information retrieval scenarios */
  informationRetrieval: informationRetrievalScenarios,

  /** All conversation flow scenarios */
  conversationFlow: conversationFlowScenarios,

  /** Easy difficulty scenarios only */
  easy: seedScenarios.filter((s) => s.difficulty === 'easy'),

  /** Medium difficulty scenarios only */
  medium: seedScenarios.filter((s) => s.difficulty === 'medium'),

  /** Hard difficulty scenarios only */
  hard: seedScenarios.filter((s) => s.difficulty === 'hard'),

  /** Quick test set - one of each type/difficulty */
  quickTest: [
    taskCompletionScenarios[0],
    informationRetrievalScenarios[0],
    conversationFlowScenarios[0],
    taskCompletionScenarios[5],
    informationRetrievalScenarios[8],
  ],
};

/**
 * Get scenarios by type
 */
export function getScenariosByType(type: ScenarioType): SeedScenario[] {
  return seedScenarios.filter((s) => s.type === type);
}

/**
 * Get scenarios by difficulty
 */
export function getScenariosByDifficulty(difficulty: Difficulty): SeedScenario[] {
  return seedScenarios.filter((s) => s.difficulty === difficulty);
}

/**
 * Summary of scenarios
 */
export const scenarioSummary = {
  total: seedScenarios.length,
  taskCompletion: taskCompletionScenarios.length,
  informationRetrieval: informationRetrievalScenarios.length,
  conversationFlow: conversationFlowScenarios.length,
  easy: seedScenarios.filter((s) => s.difficulty === 'easy').length,
  medium: seedScenarios.filter((s) => s.difficulty === 'medium').length,
  hard: seedScenarios.filter((s) => s.difficulty === 'hard').length,
};
