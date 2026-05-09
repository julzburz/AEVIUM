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

export type ChatHistoryEntry = { role: "user" | "assistant"; text: string };

export function buildFreeChatPrompt(ctx: NarrativeContext, message: string, history: ChatHistoryEntry[] = []): string {
  const lines: string[] = [];

  if (ctx.sceneContent) {
    const stripped = ctx.sceneContent.replace(/<[^>]+>/g, "").slice(-1000);
    lines.push("--- CONTEXTO DE LA ESCENA ---");
    lines.push(stripped);
    lines.push("");
  }

  if (history.length > 0) {
    lines.push("--- CONVERSACIÓN ANTERIOR ---");
    for (const entry of history.slice(-12)) {
      lines.push(`${entry.role === "user" ? "Autor" : "AEVIUM"}: ${entry.text}`);
    }
    lines.push("");
  }

  lines.push(`Autor: ${message}`);
  return lines.join("\n");
}

export function buildFreeChatSystemPrompt(): string {
  return `Eres AEVIUM, un asistente literario experto y copiloto creativo de confianza. Ayudas a autores con consejos narrativos, análisis de personajes, sugerencias de trama, técnicas de escritura, bloqueos creativos y cualquier aspecto del proceso creativo.

Reglas:
- Mantén el hilo de la conversación: recuerdas lo que el autor dijo antes en este chat
- Responde siempre en el idioma del autor
- Sé conciso pero completo; no repitas lo que ya dijiste antes
- Si te preguntan algo fuera del ámbito de la escritura y la narrativa, redirige amablemente hacia el proyecto`;
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

export function buildImportStructurePrompt(text: string, filename: string): string {
  // Send only the first 8000 chars for structure detection — we only need titles, not full content
  const preview = text.slice(0, 8000);
  return [
    `--- ARCHIVO: ${filename} ---`,
    preview,
    "",
    "Analiza el fragmento anterior (puede ser el inicio de un capítulo más largo) y devuelve EXCLUSIVAMENTE este JSON:",
    '{"chapterTitle":"...","sceneTitles":["Título escena 1","Título escena 2",...]}',
    "",
    "Reglas:",
    "1. chapterTitle: el título del capítulo. Usa el primer encabezado o la primera línea si parece un título. Si no hay título claro, genera uno descriptivo de 3-6 palabras.",
    "2. sceneTitles: lista de nombres descriptivos (2-5 palabras cada uno) para las escenas narrativas que detectes. Si no hay divisiones claras, devuelve una sola entrada.",
    "3. NO incluyas el contenido del texto, solo los títulos.",
    "4. Devuelve SOLO el JSON, sin markdown ni explicación adicional.",
  ].join("\n");
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
