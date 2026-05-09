import { ai } from "@workspace/integrations-gemini-ai";
import type { AiProvider } from "./types.js";

const MODEL = "gemini-2.5-flash";
const EMBED_MODEL = "text-embedding-004";

export class GeminiProvider implements AiProvider {
  async generateText(prompt: string, systemPrompt: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: MODEL,
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
    const response = await ai.models.generateContent({
      model: MODEL,
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
    const response = await ai.models.embedContent({
      model: EMBED_MODEL,
      contents: [{ role: "user", parts: [{ text: text.slice(0, 8192) }] }],
    });
    return response.embeddings?.[0]?.values ?? [];
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    try {
      const ok = await this.testConnection();
      return ok
        ? { valid: true }
        : { valid: false, error: "No se pudo conectar con Gemini" };
    } catch (e) {
      return { valid: false, error: String(e) };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
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
