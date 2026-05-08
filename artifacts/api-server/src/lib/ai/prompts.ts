import type { NarrativeContext } from "./types.js";

export function buildContinueScenePrompt(ctx: NarrativeContext, instruction?: string): string {
  const lines: string[] = [];
  if (ctx.sceneContent && ctx.sceneContent.trim().length > 0) {
    const stripped = ctx.sceneContent.replace(/<[^>]+>/g, "");
    lines.push("--- CONTENIDO ACTUAL DE LA ESCENA ---");
    lines.push(stripped.slice(-2000));
    lines.push("");
  }
  if (instruction) {
    lines.push(`Instrucción del autor: ${instruction}`);
    lines.push("");
  }
  lines.push(ctx.sceneContent?.trim()
    ? "Continúa la escena de forma natural, manteniendo el estilo y la voz narrativa establecidos. Escribe entre 200 y 500 palabras."
    : "Comienza la escena con una apertura evocadora. Escribe entre 200 y 500 palabras.");
  return lines.join("\n");
}

export function buildRewriteSelectionPrompt(selectedText: string, instruction: string): string {
  return [
    "--- PASAJE ORIGINAL ---",
    selectedText,
    "",
    `Instrucción: ${instruction}`,
    "",
    "Reescribe el pasaje siguiendo la instrucción. Mantén la longitud aproximada y el estilo narrativo. Devuelve SOLO el texto reescrito.",
  ].join("\n");
}

export function buildReviewCoherencePrompt(ctx: NarrativeContext): string {
  const content = ctx.sceneContent ? ctx.sceneContent.replace(/<[^>]+>/g, "") : "";
  const memory = (ctx.memoryItems ?? [])
    .map((m) => `[${m.type}] ${m.title}: ${m.content}`)
    .join("\n");

  return [
    "--- ESCENA A REVISAR ---",
    content.slice(0, 3000),
    "",
    "--- MEMORIA CANÓNICA ---",
    memory || "(sin elementos canónicos registrados)",
    "",
    "Analiza la escena en busca de inconsistencias con la memoria canónica, problemas de continuidad, contradicciones de personajes, inconsistencias de lugar o tiempo, o errores de tono. Responde EXCLUSIVAMENTE en JSON con el siguiente formato:",
    '{"issues": [{"type": "...", "description": "...", "suggestion": "..."}], "summary": "..."}',
    "",
    "Si no hay problemas, devuelve issues vacío y summary positivo.",
  ].join("\n");
}

export function buildExtractMemoryPrompt(text: string): string {
  return [
    "--- TEXTO NARRATIVO ---",
    text.slice(0, 3000),
    "",
    "Extrae elementos importantes que deberían guardarse en la memoria narrativa del proyecto: eventos, heridas, secretos, relaciones, muertes, promesas, misterios, cambios de lugar, conocimientos adquiridos.",
    "Responde EXCLUSIVAMENTE en JSON:",
    '{"suggestions": [{"type": "event|injury|secret|relationship|death|promise|mystery|location_change|knowledge|other", "title": "...", "content": "...", "confidence": 0-100}]}',
    "Solo incluye elementos realmente significativos para la continuidad narrativa.",
  ].join("\n");
}

export function buildCheckContradictionPrompt(instruction: string, memoryItems: NarrativeContext["memoryItems"]): string {
  const memory = (memoryItems ?? [])
    .map((m) => `[${m.type}] ${m.title}: ${m.content}`)
    .join("\n");

  return [
    "--- INSTRUCCIÓN DEL AUTOR ---",
    instruction,
    "",
    "--- MEMORIA CANÓNICA ---",
    memory || "(sin elementos canónicos registrados)",
    "",
    "¿La instrucción contradice algún elemento canónico? Responde EXCLUSIVAMENTE en JSON:",
    '{"hasContradiction": true|false, "contradictions": [{"description": "...", "conflictingMemory": "...", "options": ["opción 1", "opción 2"]}]}',
  ].join("\n");
}

export function buildFreeChatPrompt(ctx: NarrativeContext, message: string): string {
  const lines: string[] = [];
  if (ctx.sceneContent) {
    const stripped = ctx.sceneContent.replace(/<[^>]+>/g, "").slice(-1000);
    lines.push("--- CONTEXTO DE LA ESCENA ---");
    lines.push(stripped);
    lines.push("");
  }
  lines.push(`Pregunta/solicitud del autor: ${message}`);
  return lines.join("\n");
}

export function buildFreeChatSystemPrompt(): string {
  return `Eres AEVIUM, un asistente literario experto. Ayudas a autores con consejos narrativos, análisis de personajes, sugerencias de trama, técnicas de escritura y cualquier aspecto del proceso creativo. Responde de forma concisa y útil.`;
}
