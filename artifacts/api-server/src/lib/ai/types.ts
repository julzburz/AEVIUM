export interface NarrativeContext {
  sceneContent?: string;
  sceneTitle?: string;
  sceneSummary?: string;
  chapterTitle?: string;
  bookTitle?: string;
  projectName?: string;
  styleGuide?: {
    narrator?: string | null;
    tense?: string | null;
    tone?: string | null;
    forbiddenWords?: string | null;
    frequentWords?: string | null;
    dialogueRules?: string | null;
    pacing?: string | null;
  };
  characters?: Array<{ name: string; role?: string | null; description?: string | null }>;
  locations?: Array<{ name: string; description?: string | null }>;
  memoryItems?: Array<{ type: string; title: string; content: string; status: string }>;
  previousScene?: { title: string; content?: string | null; summary?: string | null };
  nextScene?: { title: string; summary?: string | null };
}

export interface AiGenerationResult {
  text: string;
  contextSummary?: string;
  sceneVersionId?: number;
}

export interface AiIssue {
  type: string;
  description: string;
  suggestion?: string;
}

export interface AiCoherenceResult {
  issues: AiIssue[];
  summary: string;
}

export interface AiMemorySuggestion {
  type: "event" | "injury" | "secret" | "relationship" | "death" | "promise" | "mystery" | "location_change" | "knowledge" | "other";
  title: string;
  content: string;
  confidence: number;
}

export interface AiExtractMemoryResult {
  suggestions: AiMemorySuggestion[];
}

export interface AiContradiction {
  description: string;
  conflictingMemory: string;
  options: string[];
}

export interface AiContradictionResult {
  hasContradiction: boolean;
  contradictions: AiContradiction[];
}

export interface AiProvider {
  generateText(prompt: string, systemPrompt: string): Promise<string>;
  generateStructured<T>(prompt: string, systemPrompt: string): Promise<T>;
  embedText(text: string): Promise<number[]>;
  validateConfig(): Promise<{ valid: boolean; error?: string }>;
  testConnection(): Promise<boolean>;
}
