/**
 * Winner type - which side won the comparison
 */
export type Winner = "A" | "B" | "tie" | "skip";

/**
 * Vote interface - represents a user vote on a match
 */
export interface Vote {
  id: string;
  matchId: string;
  winner: Winner;
  sessionId: string;
  createdAt: Date;
}

/**
 * Input type for creating a new vote
 */
export interface CreateVoteInput {
  id?: string;
  matchId: string;
  winner: Winner;
  sessionId: string;
}
