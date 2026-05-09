import { GoogleGenAI } from "@google/genai";

/**
 * Creates a GoogleGenAI client with a custom API key (bypasses Replit proxy).
 * Use this when you want to use a user-provided API key instead of the
 * Replit-managed integration key.
 */
export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}
