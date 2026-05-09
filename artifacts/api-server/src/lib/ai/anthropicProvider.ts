import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "./types.js";

const DEFAULT_MODEL = "claude-3-5-sonnet-latest";

export class AnthropicProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateText(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 4096,
    });
    const block = response.content[0];
    return block?.type === "text" ? block.text : "";
  }

  async generateStructured<T>(prompt: string, systemPrompt: string): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond with ONLY valid JSON, no markdown or explanation.`;
    const response = await this.client.messages.create({
      model: this.model,
      system: systemPrompt,
      messages: [{ role: "user", content: jsonPrompt }],
      temperature: 0.2,
      max_tokens: 2048,
    });
    const block = response.content[0];
    const text = block?.type === "text" ? block.text : "{}";
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match ? match[0] : text) as T;
  }

  async embedText(_text: string): Promise<number[]> {
    return [];
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    try {
      const ok = await this.testConnection();
      return ok ? { valid: true } : { valid: false, error: "No se pudo conectar con Anthropic" };
    } catch (e) {
      return { valid: false, error: String(e) };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
      });
      return response.content.length > 0;
    } catch {
      return false;
    }
  }
}

export function createAnthropicProvider(apiKey: string, model?: string): AnthropicProvider {
  return new AnthropicProvider(apiKey, model ?? DEFAULT_MODEL);
}
