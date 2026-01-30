/**
 * Category type for prompts
 */
export type Category =
  | "general"
  | "customer-support"
  | "information-retrieval"
  | "creative"
  | "multilingual";

/**
 * Prompt interface - represents a benchmark prompt
 */
export interface Prompt {
  id: string;
  category: Category;
  text: string;
  audioUrl: string | null;
  language: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Input type for creating a new prompt
 */
export interface CreatePromptInput {
  id?: string;
  category: Category;
  text: string;
  audioUrl?: string;
  language?: string;
  isActive?: boolean;
}
