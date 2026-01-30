import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface ProviderConfig {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'elevenlabs' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
  models: string[];
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface VoiceConfig {
  id: string;
  name: string;
  providerId: string;
  voiceId: string;
  language: string;
  isDefault: boolean;
}

export interface GlobalConfig {
  theme: 'light' | 'dark' | 'system';
  defaultModel: string | null;
  defaultVoice: string | null;
  autoPlay: boolean;
  showDebugInfo: boolean;
  maxConcurrentRequests: number;
  defaultTimeout: number;
  saveHistory: boolean;
  historyRetentionDays: number;
}

export interface SettingsState {
  // State
  providers: ProviderConfig[];
  voices: VoiceConfig[];
  globalConfig: GlobalConfig;
  isLoading: boolean;
  error: string | null;

  // Provider actions
  addProvider: (provider: ProviderConfig) => void;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void;
  toggleProvider: (id: string) => void;
  setProviderApiKey: (id: string, apiKey: string) => void;

  // Voice actions
  addVoice: (voice: VoiceConfig) => void;
  updateVoice: (id: string, updates: Partial<VoiceConfig>) => void;
  removeVoice: (id: string) => void;
  setDefaultVoice: (id: string) => void;

  // Global config actions
  updateGlobalConfig: (updates: Partial<GlobalConfig>) => void;
  setTheme: (theme: GlobalConfig['theme']) => void;
  setDefaultModel: (modelId: string | null) => void;
  toggleAutoPlay: () => void;
  toggleDebugInfo: () => void;
  toggleSaveHistory: () => void;

  // General actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultGlobalConfig: GlobalConfig = {
  theme: 'system',
  defaultModel: null,
  defaultVoice: null,
  autoPlay: true,
  showDebugInfo: false,
  maxConcurrentRequests: 3,
  defaultTimeout: 30000,
  saveHistory: true,
  historyRetentionDays: 30,
};

const initialState = {
  providers: [],
  voices: [],
  globalConfig: defaultGlobalConfig,
  isLoading: false,
  error: null,
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        // Provider actions
        addProvider: (provider) =>
          set(
            (state) => {
              state.providers.push(provider);
            },
            false,
            'settings/addProvider'
          ),

        updateProvider: (id, updates) =>
          set(
            (state) => {
              const index = state.providers.findIndex((p) => p.id === id);
              if (index !== -1) {
                Object.assign(state.providers[index], updates);
              }
            },
            false,
            'settings/updateProvider'
          ),

        removeProvider: (id) =>
          set(
            (state) => {
              state.providers = state.providers.filter((p) => p.id !== id);
            },
            false,
            'settings/removeProvider'
          ),

        toggleProvider: (id) =>
          set(
            (state) => {
              const provider = state.providers.find((p) => p.id === id);
              if (provider) {
                provider.enabled = !provider.enabled;
              }
            },
            false,
            'settings/toggleProvider'
          ),

        setProviderApiKey: (id, apiKey) =>
          set(
            (state) => {
              const provider = state.providers.find((p) => p.id === id);
              if (provider) {
                provider.apiKey = apiKey;
              }
            },
            false,
            'settings/setProviderApiKey'
          ),

        // Voice actions
        addVoice: (voice) =>
          set(
            (state) => {
              state.voices.push(voice);
            },
            false,
            'settings/addVoice'
          ),

        updateVoice: (id, updates) =>
          set(
            (state) => {
              const index = state.voices.findIndex((v) => v.id === id);
              if (index !== -1) {
                Object.assign(state.voices[index], updates);
              }
            },
            false,
            'settings/updateVoice'
          ),

        removeVoice: (id) =>
          set(
            (state) => {
              state.voices = state.voices.filter((v) => v.id !== id);
            },
            false,
            'settings/removeVoice'
          ),

        setDefaultVoice: (id) =>
          set(
            (state) => {
              state.voices.forEach((v) => {
                v.isDefault = v.id === id;
              });
              state.globalConfig.defaultVoice = id;
            },
            false,
            'settings/setDefaultVoice'
          ),

        // Global config actions
        updateGlobalConfig: (updates) =>
          set(
            (state) => {
              Object.assign(state.globalConfig, updates);
            },
            false,
            'settings/updateGlobalConfig'
          ),

        setTheme: (theme) =>
          set(
            (state) => {
              state.globalConfig.theme = theme;
            },
            false,
            'settings/setTheme'
          ),

        setDefaultModel: (modelId) =>
          set(
            (state) => {
              state.globalConfig.defaultModel = modelId;
            },
            false,
            'settings/setDefaultModel'
          ),

        toggleAutoPlay: () =>
          set(
            (state) => {
              state.globalConfig.autoPlay = !state.globalConfig.autoPlay;
            },
            false,
            'settings/toggleAutoPlay'
          ),

        toggleDebugInfo: () =>
          set(
            (state) => {
              state.globalConfig.showDebugInfo = !state.globalConfig.showDebugInfo;
            },
            false,
            'settings/toggleDebugInfo'
          ),

        toggleSaveHistory: () =>
          set(
            (state) => {
              state.globalConfig.saveHistory = !state.globalConfig.saveHistory;
            },
            false,
            'settings/toggleSaveHistory'
          ),

        // General actions
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            'settings/setLoading'
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
              state.isLoading = false;
            },
            false,
            'settings/setError'
          ),

        reset: () =>
          set(
            () => initialState,
            false,
            'settings/reset'
          ),
      })),
      {
        name: 'voicebench-settings',
        partialize: (state) => ({
          providers: state.providers.map((p) => ({ ...p, apiKey: undefined })), // Don't persist API keys
          voices: state.voices,
          globalConfig: state.globalConfig,
        }),
      }
    ),
    { name: 'SettingsStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
