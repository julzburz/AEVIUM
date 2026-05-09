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
    ? "Continúa la escena de forma natural, manteniendo el estilo y la voz narrativa establecidos. Escribe entre 800 y 1500 palabras."
    : "Comienza la escena con una apertura evocadora y rica en detalles sensoriales. Escribe entre 800 y 1500 palabras.");
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

export function buildStyleChatSystemPrompt(): string {
  return `Eres AEVIUM, un consultor de estilo narrativo amigable. Ayudas a escritores a configurar su guía de estilo de escritura de forma conversacional.

Tu objetivo es hacer preguntas naturales y sencillas para entender:
1. Quién narra la historia (perspectiva narrativa)
2. En qué tiempo verbal está escrita
3. El tono y ritmo general
4. Preferencias específicas de estilo (palabras, diálogos, etc.)

Reglas importantes:
- Haz UNA sola pregunta a la vez, de forma natural y sin tecnicismos
- Si el escritor no sabe responder algo, sugiere un valor por defecto razonable y continúa
- Responde SIEMPRE en el mismo idioma que el escritor usa contigo
- Sé cálido, alentador y breve en tus respuestas
- Cuando hayas hecho al menos 3 intercambios con el escritor Y tengas suficiente información, escribe primero un resumen amigable de lo detectado y luego añade este bloque exacto al final:

###PARAMS###
{"narrator":"VALOR","tense":"VALOR","povType":"VALOR","pacing":"VALOR","tone":"VALOR","sensorDetailLevel":"VALOR","violenceLevel":"VALOR","introspectionLevel":"VALOR","forbiddenWords":"VALOR","frequentWords":"VALOR","dialogueRules":"VALOR","povRules":"VALOR"}
###END_PARAMS###

Valores válidos para los campos enum:
- narrator: "first_person" | "third_limited" | "third_omniscient" | "second_person" | null
- tense: "past" | "present" | null
- povType: "single" | "multiple" | null  
- pacing: "slow" | "medium" | "fast" | null
- El resto son strings libres o null si no se mencionó nada relevante

Si un campo no fue mencionado, usa null. No inventes información que el escritor no haya dado.`;
}

export function buildStyleChatPrompt(messages: { role: string; content: string }[]): string {
  return messages.map(m => `${m.role === "user" ? "Escritor" : "AEVIUM"}: ${m.content}`).join("\n\n");
}

export function buildStyleAnalyzePrompt(text: string): string {
  return [
    "--- FRAGMENTO DEL TEXTO A ANALIZAR ---",
    text.slice(0, 3000),
    "",
    "Analiza el estilo narrativo de este texto y extrae los parámetros de estilo. Responde EXCLUSIVAMENTE en JSON con este formato:",
    '{"narrator":"first_person|third_limited|third_omniscient|second_person|null","tense":"past|present|null","povType":"single|multiple|null","pacing":"slow|medium|fast|null","tone":"descripción del tono","sensorDetailLevel":"descripción","violenceLevel":"descripción","introspectionLevel":"descripción","forbiddenWords":null,"frequentWords":"palabras o recursos frecuentes detectados","dialogueRules":"descripción del estilo de diálogo si hay","povRules":null,"summary":"resumen en 2-3 frases del estilo detectado"}',
    "",
    "Basa tu análisis únicamente en lo que el texto muestra. Si algo no está claro, usa null.",
  ].join("\n");
}
