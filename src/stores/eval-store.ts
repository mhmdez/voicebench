import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export type EvalStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';
export type ScenarioStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: string;
  promptText: string;
  expectedBehavior?: string;
  status: ScenarioStatus;
}

export interface ScenarioResult {
  scenarioId: string;
  modelId: string;
  response: string;
  audioUrl?: string;
  latencyMs: number;
  tokensUsed?: number;
  score?: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface EvalRun {
  id: string;
  name: string;
  modelIds: string[];
  scenarioIds: string[];
  status: EvalStatus;
  progress: number; // 0-100
  startedAt: number;
  completedAt?: number;
  config: EvalConfig;
}

export interface EvalConfig {
  parallelism: number;
  retryOnFailure: boolean;
  maxRetries: number;
  timeoutMs: number;
  saveIntermediateResults: boolean;
}

export interface EvalState {
  // State
  currentRun: EvalRun | null;
  scenarios: Scenario[];
  results: ScenarioResult[];
  runHistory: EvalRun[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setScenarios: (scenarios: Scenario[]) => void;
  addScenario: (scenario: Scenario) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  removeScenario: (id: string) => void;

  startRun: (run: EvalRun) => void;
  updateRunProgress: (progress: number) => void;
  updateRunStatus: (status: EvalStatus) => void;
  completeRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  cancelRun: () => void;

  addResult: (result: ScenarioResult) => void;
  setResults: (results: ScenarioResult[]) => void;
  clearResults: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentRun: null,
  scenarios: [],
  results: [],
  runHistory: [],
  isLoading: false,
  error: null,
};

export const useEvalStore = create<EvalState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // Scenario actions
      setScenarios: (scenarios) =>
        set(
          (state) => {
            state.scenarios = scenarios;
          },
          false,
          'eval/setScenarios'
        ),

      addScenario: (scenario) =>
        set(
          (state) => {
            state.scenarios.push(scenario);
          },
          false,
          'eval/addScenario'
        ),

      updateScenario: (id, updates) =>
        set(
          (state) => {
            const index = state.scenarios.findIndex((s) => s.id === id);
            if (index !== -1) {
              Object.assign(state.scenarios[index], updates);
            }
          },
          false,
          'eval/updateScenario'
        ),

      removeScenario: (id) =>
        set(
          (state) => {
            state.scenarios = state.scenarios.filter((s) => s.id !== id);
          },
          false,
          'eval/removeScenario'
        ),

      // Run actions
      startRun: (run) =>
        set(
          (state) => {
            state.currentRun = run;
            state.results = [];
            state.error = null;
          },
          false,
          'eval/startRun'
        ),

      updateRunProgress: (progress) =>
        set(
          (state) => {
            if (state.currentRun) {
              state.currentRun.progress = progress;
            }
          },
          false,
          'eval/updateRunProgress'
        ),

      updateRunStatus: (status) =>
        set(
          (state) => {
            if (state.currentRun) {
              state.currentRun.status = status;
            }
          },
          false,
          'eval/updateRunStatus'
        ),

      completeRun: () =>
        set(
          (state) => {
            if (state.currentRun) {
              state.currentRun.status = 'completed';
              state.currentRun.completedAt = Date.now();
              state.currentRun.progress = 100;
              state.runHistory.push({ ...state.currentRun });
            }
          },
          false,
          'eval/completeRun'
        ),

      pauseRun: () =>
        set(
          (state) => {
            if (state.currentRun && state.currentRun.status === 'running') {
              state.currentRun.status = 'paused';
            }
          },
          false,
          'eval/pauseRun'
        ),

      resumeRun: () =>
        set(
          (state) => {
            if (state.currentRun && state.currentRun.status === 'paused') {
              state.currentRun.status = 'running';
            }
          },
          false,
          'eval/resumeRun'
        ),

      cancelRun: () =>
        set(
          (state) => {
            if (state.currentRun) {
              state.currentRun.status = 'failed';
              state.currentRun.completedAt = Date.now();
              state.runHistory.push({ ...state.currentRun });
              state.currentRun = null;
            }
          },
          false,
          'eval/cancelRun'
        ),

      // Result actions
      addResult: (result) =>
        set(
          (state) => {
            state.results.push(result);
          },
          false,
          'eval/addResult'
        ),

      setResults: (results) =>
        set(
          (state) => {
            state.results = results;
          },
          false,
          'eval/setResults'
        ),

      clearResults: () =>
        set(
          (state) => {
            state.results = [];
          },
          false,
          'eval/clearResults'
        ),

      // General actions
      setLoading: (loading) =>
        set(
          (state) => {
            state.isLoading = loading;
          },
          false,
          'eval/setLoading'
        ),

      setError: (error) =>
        set(
          (state) => {
            state.error = error;
            state.isLoading = false;
          },
          false,
          'eval/setError'
        ),

      reset: () => set(initialState, false, 'eval/reset'),
    })),
    { name: 'EvalStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
