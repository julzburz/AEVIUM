import OpenAI from "openai";
import type { AiProvider } from "./types.js";

const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAIProvider implements AiProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateText(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 4096,
    });
    return response.choices[0]?.message?.content ?? "";
  }

  async generateStructured<T>(prompt: string, systemPrompt: string): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });
    const text = response.choices[0]?.message?.content ?? "{}";
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match ? match[0] : text) as T;
  }

  async embedText(_text: string): Promise<number[]> {
    return [];
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    try {
      const ok = await this.testConnection();
      return ok ? { valid: true } : { valid: false, error: "No se pudo conectar con OpenAI" };
    } catch (e) {
      return { valid: false, error: String(e) };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      });
      return !!response.choices[0]?.message?.content;
    } catch {
      return false;
    }
  }
}

export function createOpenAIProvider(apiKey: string, model?: string): OpenAIProvider {
  return new OpenAIProvider(apiKey, model ?? DEFAULT_MODEL);
}
