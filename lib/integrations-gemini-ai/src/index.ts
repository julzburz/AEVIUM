export { ai } from "./client";
export type { GoogleGenAI } from "@google/genai";
export { createGeminiClient } from "./factory";
export { generateImage } from "./image";
export { batchProcess, batchProcessWithSSE, isRateLimitError, type BatchOptions } from "./batch";
