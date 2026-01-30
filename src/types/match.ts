import type { Category } from "./prompt";

/**
 * Match status type
 */
export type MatchStatus = "pending" | "completed" | "expired";

/**
 * Match interface - represents a head-to-head comparison between TTS providers
 */
export interface Match {
  id: string;
  promptId: string;
  category: Category;
  providerAId: string;
  providerBId: string;
  responseAUrl: string | null;
  responseBUrl: string | null;
  responseALatency: number | null;
  responseBLatency: number | null;
  createdAt: Date;
  votedAt: Date | null;
  status: MatchStatus;
}

/**
 * Input type for creating a new match
 */
export interface CreateMatchInput {
  id?: string;
  promptId: string;
  category: Category;
  providerAId: string;
  providerBId: string;
  responseAUrl?: string;
  responseBUrl?: string;
  responseALatency?: number;
  responseBLatency?: number;
  status?: MatchStatus;
}
