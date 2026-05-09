import { ai as replitAi, createGeminiClient } from "@workspace/integrations-gemini-ai";
import type { AiProvider } from "./types.js";

const DEFAULT_MODEL = "gemini-2.5-flash";
const EMBED_MODEL = "text-embedding-004";

type GenAIClient = typeof replitAi;

export class GeminiProvider implements AiProvider {
  private readonly client: GenAIClient;
  private readonly model: string;

  constructor(client: GenAIClient = replitAi, model: string = DEFAULT_MODEL) {
    this.client = client;
    this.model = model;
  }

  async generateText(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.85,
        maxOutputTokens: 4096,
      },
    });
    return response.text ?? "";
  }

  async generateStructured<T>(prompt: string, systemPrompt: string): Promise<T> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });
    const text = response.text ?? "{}";
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match ? match[0] : text) as T;
  }

  async embedText(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: EMBED_MODEL,
      contents: [{ role: "user", parts: [{ text: text.slice(0, 8192) }] }],
    });
    return response.embeddings?.[0]?.values ?? [];
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    try {
      const ok = await this.testConnection();
      return ok ? { valid: true } : { valid: false, error: "No se pudo conectar con Gemini" };
    } catch (e) {
      return { valid: false, error: String(e) };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
        config: { maxOutputTokens: 10 },
      });
      return !!response.text;
    } catch {
      return false;
    }
  }
}

export const geminiProvider = new GeminiProvider();

/**
 * Creates a GeminiProvider using a user-supplied API key (bypasses Replit proxy).
 */
export function createCustomGeminiProvider(apiKey: string, model?: string): GeminiProvider {
  const customClient = createGeminiClient(apiKey);
  return new GeminiProvider(customClient as GenAIClient, model ?? DEFAULT_MODEL);
}
