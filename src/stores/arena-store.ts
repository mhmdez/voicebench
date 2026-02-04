import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export type VotingState = 'idle' | 'listening' | 'voting' | 'voted' | 'revealed';

export interface Model {
  id: string;
  name: string;
  provider: string;
}

export interface MatchResult {
  winnerId: string | null; // null for tie
  timestamp: number;
  category: string;
  modelA: Model;
  modelB: Model;
}

export interface CurrentMatch {
  id: string;
  modelA: Model;
  modelB: Model;
  promptId: string;
  promptText: string;
  promptAudioUrl?: string | null;
  responseA?: string;
  responseB?: string;
  audioUrlA?: string;
  audioUrlB?: string;
  isMock?: boolean;
}

export interface ArenaState {
  // State
  currentMatch: CurrentMatch | null;
  category: string;
  votingState: VotingState;
  matchHistory: MatchResult[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCategory: (category: string) => void;
  startNewMatch: (match: CurrentMatch) => void;
  setVotingState: (state: VotingState) => void;
  setResponses: (responseA: string, responseB: string) => void;
  setAudioUrls: (audioUrlA: string, audioUrlB: string) => void;
  submitVote: (winnerId: string | null) => void;
  clearMatch: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentMatch: null,
  category: 'general',
  votingState: 'idle' as VotingState,
  matchHistory: [],
  isLoading: false,
  error: null,
};

export const useArenaStore = create<ArenaState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setCategory: (category) =>
        set(
          (state) => {
            state.category = category;
          },
          false,
          'arena/setCategory'
        ),

      startNewMatch: (match) =>
        set(
          (state) => {
            state.currentMatch = match;
            state.votingState = 'idle';
            state.error = null;
          },
          false,
          'arena/startNewMatch'
        ),

      setVotingState: (votingState) =>
        set(
          (state) => {
            state.votingState = votingState;
          },
          false,
          'arena/setVotingState'
        ),

      setResponses: (responseA, responseB) =>
        set(
          (state) => {
            if (state.currentMatch) {
              state.currentMatch.responseA = responseA;
              state.currentMatch.responseB = responseB;
            }
          },
          false,
          'arena/setResponses'
        ),

      setAudioUrls: (audioUrlA, audioUrlB) =>
        set(
          (state) => {
            if (state.currentMatch) {
              state.currentMatch.audioUrlA = audioUrlA;
              state.currentMatch.audioUrlB = audioUrlB;
            }
          },
          false,
          'arena/setAudioUrls'
        ),

      submitVote: (winnerId) =>
        set(
          (state) => {
            if (state.currentMatch) {
              const result: MatchResult = {
                winnerId,
                timestamp: Date.now(),
                category: state.category,
                modelA: state.currentMatch.modelA,
                modelB: state.currentMatch.modelB,
              };
              state.matchHistory.push(result);
              state.votingState = 'voted';
            }
          },
          false,
          'arena/submitVote'
        ),

      clearMatch: () =>
        set(
          (state) => {
            state.currentMatch = null;
            state.votingState = 'idle';
          },
          false,
          'arena/clearMatch'
        ),

      setLoading: (loading) =>
        set(
          (state) => {
            state.isLoading = loading;
          },
          false,
          'arena/setLoading'
        ),

      setError: (error) =>
        set(
          (state) => {
            state.error = error;
            state.isLoading = false;
          },
          false,
          'arena/setError'
        ),

      reset: () => set(initialState, false, 'arena/reset'),
    })),
    { name: 'ArenaStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
