/**
 * Rating Types
 *
 * TypeScript interfaces for Elo ratings in the benchmark system.
 */

/** Benchmark categories for rating */
export type RatingCategory =
  | 'general'
  | 'customer-support'
  | 'information-retrieval'
  | 'creative'
  | 'multilingual';

/** Default Elo rating for new providers */
export const DEFAULT_ELO = 1500;

/** Rating entity - tracks Elo score per provider per category */
export interface Rating {
  /** Unique identifier */
  id: number;
  /** Foreign key to provider */
  providerId: number;
  /** Rating category */
  category: RatingCategory;
  /** Current Elo rating */
  elo: number;
  /** Total matches played */
  matchCount: number;
  /** Number of wins */
  winCount: number;
  /** Number of ties */
  tieCount: number;
  /** Last update timestamp */
  updatedAt: Date;
}

/** Rating creation input (without auto-generated fields) */
export type NewRating = Omit<Rating, 'id' | 'updatedAt'>;
