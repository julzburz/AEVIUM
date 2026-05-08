import { ai } from "@workspace/integrations-gemini-ai";
import type { AiProvider } from "./types.js";

const MODEL = "gemini-2.5-flash";

export class GeminiProvider implements AiProvider {
  async generateText(prompt: string, systemPrompt: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.85,
        maxOutputTokens: 2048,
      },
    });
    return response.text ?? "";
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
