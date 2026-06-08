Última actualización: Mayo 2026

Índice
Visión general
Stack tecnológico
Arquitectura del monorepo
Base de datos — Esquema completo
API REST — Endpoints completos
Sistema de IA
Frontend — Páginas y componentes
Autenticación y seguridad
Internacionalización (i18n)
Sistema de temas
Paleta de colores y diseño
Flujos de usuario
Variables de entorno y secretos
Estado actual y pendientes
1. Visión general
AEVIUM es un asistente de escritura narrativa con IA orientado a escritores de ficción serios. Su filosofía es ser el equivalente moderno de Scrivener pero con IA integrada como copiloto narrativo — no como generador de texto automático sino como asistente que respeta la voz del autor.

Propuesta de valor
Organización jerárquica: Proyecto → Libro → Capítulo → Escena (igual que Scrivener)
Memoria narrativa canónica: La IA recuerda personajes, lugares, eventos y reglas del mundo
Coherencia activa: Detecta contradicciones antes de que el autor las cometa
Guía de estilo por proyecto: El agente aprende la voz narrativa del autor y la respeta
Multi-proveedor de IA: Gemini integrado gratis + OpenAI/Anthropic/Claude con clave propia
Usuarios objetivo
Escritores de ficción (novelas, sagas, guiones, artículos literarios) que quieren una herramienta seria, no un generador de texto genérico.

2. Stack tecnológico
Frontend — artifacts/aevium
Tecnología	Versión	Uso
React	19.1.0	UI framework
Vite	^7.3.2	Build tool y dev server
TypeScript	~5.9.2	Tipado estático
TailwindCSS	^4.1.14	Estilos utilitarios
shadcn/ui + Radix UI	varias	Componentes de UI accesibles
TipTap	^3.22.5	Editor de texto enriquecido (escenas)
@tanstack/react-query	^5.90.21	Server state y caché
Wouter	^3.3.5	Enrutamiento SPA
next-themes	^0.4.6	Sistema de temas (dark/light/system)
Framer Motion	^12.23.24	Animaciones
Clerk React	^6.6.1	Autenticación
DOMPurify	^3.4.2	Sanitización de HTML del editor
lucide-react	^0.545.0	Iconografía
react-hook-form	^7.55.0	Formularios
zod	^3.25.76	Validación de esquemas
Backend — artifacts/api-server
Tecnología	Versión	Uso
Node.js / Express 5	^5	Servidor HTTP
TypeScript	~5.9.2	Tipado
Drizzle ORM	^0.45.2	ORM para PostgreSQL
@clerk/express	^2.1.14	Middleware de autenticación
OpenAI SDK	^6.37.0	Proveedor de IA
Anthropic SDK	^0.95.1	Proveedor de IA
Gemini	integrado	Proveedor de IA + embeddings
Zod	^3.25.76	Validación de inputs
Pino	^9	Logging estructurado
esbuild	^0.27.3	Compilación rápida
Base de datos
Tecnología	Uso
PostgreSQL (Neon)	Base de datos principal
pgvector	Extensión para búsqueda semántica por vectores
Drizzle Kit	Migraciones y schema push
Infraestructura
Componente	Tecnología
Monorepo	pnpm workspaces
Autenticación	Clerk (hosted, proxy configurado)
Hosting	Local (Desarrollo) → Vercel/VPS (Producción)
Secretos	Variables de entorno locales (.env)
3. Arquitectura del monorepo
workspace/
├── artifacts/
│   ├── aevium/           # Frontend React+Vite (puerto dinámico via $PORT)
│   └── api-server/       # Backend Express 5 (puerto 8080)
├── lib/
│   ├── db/               # Esquema Drizzle + cliente PostgreSQL
│   ├── api-client-react/ # Cliente TypeScript generado con TanStack Query
│   ├── api-zod/          # Esquemas Zod compartidos
│   └── integrations-gemini-ai/ # SDK de Gemini
├── scripts/              # Scripts utilitarios
├── pnpm-workspace.yaml   # Configuración del workspace + catálogo de versiones
└── .local/               # Archivos locales (documentación, skills, tareas)

Paquetes internos
@workspace/db — Exporta tablas Drizzle, tipos y cliente DB
@workspace/api-client-react — Hooks TanStack Query + customFetch para llamadas al API
@workspace/api-zod — Esquemas Zod de validación compartidos entre frontend y backend
@workspace/integrations-gemini-ai — Wrapper del SDK de Gemini
Comunicación frontend ↔ backend
El frontend usa customFetch de @workspace/api-client-react que prepende automáticamente la URL base
Autenticación: Clerk emite tokens JWT que Express valida con @clerk/express
Vite usa un proxy local: /api → backend (localhost:8080)
4. Base de datos — Esquema completo
Diagrama de relaciones
profiles (userId)
    │
    └── ai_credentials (userId, projectId?)  ← global o por proyecto
    
projects (userId)
    │
    ├── books
    │   └── chapters
    │       └── scenes
    │           └── scene_versions
    │
    ├── characters (+ embedding vector 768d)
    ├── locations  (+ embedding vector 768d)
    ├── memory_items (+ embedding vector 768d)
    ├── world_rules
    ├── timeline_events
    ├── style_guides (1:1 con project)
    └── continuity_alerts

Tabla: profiles
Perfil de usuario sincronizado con Clerk.

Campo	Tipo	Descripción
id	serial PK	
userId	text NOT NULL UNIQUE	ID de Clerk
displayName	text	Nombre visible
bio	text	Biografía del autor
theme	text	"dark" | "light" | "system" (default: "dark")
language	text	"es" | "en" (default: "es")
createdAt	timestamp	
updatedAt	timestamp	
Tabla: projects
Proyecto narrativo raíz del árbol de contenido.

Campo	Tipo	Descripción
id	serial PK	
userId	text NOT NULL	ID de Clerk del propietario
name	text NOT NULL	Nombre del proyecto
description	text	Sinopsis general
type	enum	novel | saga | articles | screenplay | other
primaryLanguage	text	"es" | "en" (default: "en")
status	enum	active | archived | completed
createdAt	timestamp	
updatedAt	timestamp	
Tabla: books
Libro dentro de un proyecto (un proyecto saga puede tener múltiples libros).

Campo	Tipo	Descripción
id	serial PK	
projectId	integer FK → projects	Cascade delete
title	text NOT NULL	
subtitle	text	
position	integer	Orden dentro del proyecto
status	enum	draft | in_progress | completed | archived
synopsis	text	Sinopsis del libro
createdAt	timestamp	
updatedAt	timestamp	
Tabla: chapters
Capítulo dentro de un libro.

Campo	Tipo	Descripción
id	serial PK	
bookId	integer FK → books	Cascade delete
title	text NOT NULL	
position	integer	Orden dentro del libro
summary	text	Resumen del capítulo
status	enum	draft | in_review | ready | blocked
wordCount	integer	Conteo de palabras (calculado)
createdAt	timestamp	
updatedAt	timestamp	
Tabla: scenes
Unidad mínima de escritura. Cada escena tiene su propio editor TipTap.

Campo	Tipo	Descripción
id	serial PK	
chapterId	integer FK → chapters	Cascade delete
title	text NOT NULL	
position	integer	Orden dentro del capítulo
content	text	HTML del editor TipTap
summary	text	Resumen generado o manual
povCharacterId	integer	ID del personaje POV (opcional)
locationId	integer	ID del lugar (opcional)
timelinePosition	text	Posición en la línea temporal
narrativeGoal	text	Objetivo narrativo de la escena
wordCount	integer	Conteo de palabras
status	enum	draft | in_review | ready | blocked | needs_rewrite | needs_continuity
createdAt	timestamp	
updatedAt	timestamp	
Tabla: scene_versions
Historial de versiones propuestas por la IA para cada escena. El autor acepta o rechaza.

Campo	Tipo	Descripción
id	serial PK	
sceneId	integer FK → scenes	Cascade delete
originalContent	text	Contenido antes de la propuesta
userInstruction	text	Instrucción que dio el autor
proposedContent	text	HTML propuesto por la IA
status	enum	pending | accepted | rejected
userId	text NOT NULL	Quién pidió la versión
createdAt	timestamp	
Tabla: characters
Personajes del proyecto con embedding para búsqueda semántica.

Campo	Tipo	Descripción
id	serial PK	
projectId	integer FK → projects	Cascade delete
name	text NOT NULL	
role	enum	protagonist | antagonist | secondary | minor
physicalDescription	text	Descripción física
personality	text	Rasgos de personalidad
motivations	text	Motivaciones y objetivos
currentState	text	Estado actual en la narrativa
knowledgeState	text	Qué sabe y qué no sabe el personaje
injuries	text	Lesiones activas
secrets	text	Secretos que guarda
relationships	text	Relaciones con otros personajes
embedding	vector(768)	Vector semántico para búsqueda pgvector
createdAt	timestamp	
updatedAt	timestamp	
Tabla: locations
Lugares del mundo narrativo con embedding semántico.

Campo	Tipo	Descripción
id	serial PK	
projectId	integer FK → projects	Cascade delete
name	text NOT NULL	
description	text	Descripción del lugar
significance	text	Importancia narrativa
embedding	vector(768)	Vector semántico
createdAt	timestamp	
updatedAt	timestamp	
Tabla: memory_items
Memoria narrativa canónica del proyecto. Es la "biblia" que la IA consulta.

Campo	Tipo	Descripción
id	serial PK	
projectId	integer FK → projects	Cascade delete
type	enum	event | injury | secret | relationship | death | promise | mystery | location_change | knowledge | other
title	text NOT NULL	Título del elemento de memoria
content	text NOT NULL	Descripción completa
scope	enum	global | book | chapter | scene
status	enum	suggested | canonical | discarded
confidence	integer	Confianza de la sugerencia (0-100)
sourceSceneId	integer	Escena de la que se extrajo
embedding	vector(768)	Vector semántico
createdAt	timestamp	
updatedAt	timestamp	
Flujo de memoria:

La IA lee la escena recién escrita → sugiere ítems de memoria
El autor los revisa (status: suggested)
Los aprueba → pasan a canonical (la IA los usará en futuras escrituras)
Los rechaza → pasan a discarded (ignorados)
Tabla: world_rules
Reglas del mundo narrativo (magia, física, sociedad, etc.) que la IA debe respetar.

Campo	Tipo	Descripción
id	serial PK	
projectId	integer FK → projects	Cascade delete
title	text NOT NULL	Nombre de la regla
content	text NOT NULL	Descripción detallada
category	text	Categoría libre (magia, política, etc.)
createdAt	timestamp	
updatedAt	timestamp	
Tabla: timeline_events
Línea de tiempo narrativa del proyecto.

Campo	Tipo	Descripción
id	serial PK	
projectId	integer FK → projects	Cascade delete
bookId	integer	Referencia opcional al libro
chapterId	integer	Referencia opcional al capítulo
sceneId	integer	Referencia opcional a la escena
characterId	integer	Personaje involucrado (opcional)
eventType	enum	death | injury | travel | revelation | conflict | romance | political | worldbuilding | other
description	text NOT NULL	Descripción del evento
dateLabel	text	Fecha narrativa (ej: "Día 3 de la guerra")
orderIndex	integer	Orden en la línea de tiempo
createdAt	timestamp	
Tabla: style_guides
Guía de estilo narrativo del proyecto (1 por proyecto). La IA la respeta en toda escritura.

Campo	Tipo	Descripción
id	serial PK	
projectId	integer FK UNIQUE → projects	Cascade delete (1:1)
narrator	enum	first_person | third_limited | third_omniscient | second_person
tense	enum	past | present
povType	enum	single | multiple
pacing	enum	slow | medium | fast
tone	text	Descripción libre del tono
sensorDetailLevel	text	Nivel de detalle sensorial
violenceLevel	text	Nivel y tipo de violencia
introspectionLevel	text	Nivel de introspección interna
forbiddenWords	text	Palabras que el autor nunca usa
frequentWords	text	Palabras y recursos característicos
dialogueRules	text	Reglas de formato de diálogo
povRules	text	Reglas de punto de vista
additionalNotes	text	Notas adicionales libres
createdAt	timestamp	
updatedAt	timestamp	
Tabla: continuity_alerts
Alertas de inconsistencia detectadas por la IA.

Campo	Tipo	Descripción
id	serial PK	
projectId	integer FK → projects	Cascade delete
sceneId	integer FK → scenes	Set null on delete
message	text NOT NULL	Descripción del problema
severity	enum	info | warning | error
isResolved	boolean	Si el autor la marcó como resuelta
resolvedAt	timestamp	Cuándo se resolvió
dismissedAs	text	Motivo de descarte si se ignoró
createdAt	timestamp	
Tabla: ai_credentials
Claves de API de IA del usuario. Pueden ser globales (projectId = NULL) o por proyecto.

Campo	Tipo	Descripción
id	serial PK	
userId	text NOT NULL	ID de Clerk
projectId	integer FK → projects (nullable)	NULL = clave global
provider	enum	openai | anthropic | gemini | mistral
model	text	Modelo específico elegido
encryptedSecret	text	Clave cifrada con AES-256-GCM
isDefault	boolean	Si esta es la clave activa para ese scope
createdAt	timestamp	
updatedAt	timestamp	
Jerarquía de proveedor para una petición de IA:

1. Clave con isDefault=true y projectId=<id del proyecto>
2. Clave con isDefault=true y projectId=NULL (global)
3. Gemini (oficial, requiere clave)

Extensión pgvector
Activada en la base de datos Neon
Dimensiones: 768 (texto-embedding-004 de Gemini)
Columna embedding vector(768) en: memory_items, characters, locations
Búsqueda: distancia coseno con operador <=>
Tipo personalizado en Drizzle: lib/db/src/schema/vectorType.ts
5. API REST — Endpoints completos
Base URL: /api
Autenticación: Todos los endpoints requieren requireAuth (token Clerk en header)

Perfil de usuario
Método	Ruta	Descripción
GET	/me/profile	Obtener perfil del usuario autenticado
PUT	/me/profile	Actualizar perfil (nombre, tema, idioma)
Proyectos
Método	Ruta	Descripción
GET	/projects	Listar proyectos del usuario
POST	/projects	Crear proyecto
GET	/projects/:id	Obtener proyecto
PATCH	/projects/:id	Actualizar proyecto
DELETE	/projects/:id	Eliminar proyecto (cascade)
GET	/projects/:id/summary	Estadísticas del proyecto (palabras, capítulos, etc.)
Libros
Método	Ruta	Descripción
GET	/projects/:projectId/books	Listar libros del proyecto
POST	/projects/:projectId/books	Crear libro
GET	/projects/:projectId/books/:id	Obtener libro
PATCH	/projects/:projectId/books/:id	Actualizar libro
DELETE	/projects/:projectId/books/:id	Eliminar libro (cascade)
Capítulos
Método	Ruta	Descripción
GET	/books/:bookId/chapters	Listar capítulos
POST	/books/:bookId/chapters	Crear capítulo
GET	/books/:bookId/chapters/:id	Obtener capítulo
PATCH	/books/:bookId/chapters/:id	Actualizar capítulo
DELETE	/books/:bookId/chapters/:id	Eliminar capítulo (cascade)
Escenas
Método	Ruta	Descripción
GET	/chapters/:chapterId/scenes	Listar escenas
POST	/chapters/:chapterId/scenes	Crear escena
GET	/chapters/:chapterId/scenes/:id	Obtener escena
PATCH	/chapters/:chapterId/scenes/:id	Actualizar escena (auto-actualiza wordCount)
DELETE	/chapters/:chapterId/scenes/:id	Eliminar escena
Versiones de escenas (historial IA)
Método	Ruta	Descripción
GET	/chapters/:chapterId/scenes/:sceneId/versions	Listar versiones propuestas
PATCH	/chapters/:chapterId/scenes/:sceneId/versions/:id	Aceptar o rechazar versión
Personajes
Método	Ruta	Descripción
GET	/projects/:projectId/characters	Listar personajes
POST	/projects/:projectId/characters	Crear personaje (dispara embedding async)
PATCH	/projects/:projectId/characters/:id	Actualizar personaje (re-embeds async)
DELETE	/projects/:projectId/characters/:id	Eliminar personaje
Lugares
Método	Ruta	Descripción
GET	/projects/:projectId/locations	Listar lugares
POST	/projects/:projectId/locations	Crear lugar (dispara embedding async)
PATCH	/projects/:projectId/locations/:id	Actualizar lugar (re-embeds async)
DELETE	/projects/:projectId/locations/:id	Eliminar lugar
Memoria narrativa
Método	Ruta	Descripción
GET	/projects/:projectId/memory	Listar ítems de memoria (filtrable por status)
POST	/projects/:projectId/memory	Crear ítem de memoria
PATCH	/projects/:projectId/memory/:id	Actualizar ítem (aprobar/rechazar/editar)
DELETE	/projects/:projectId/memory/:id	Eliminar ítem
Reglas del mundo
Método	Ruta	Descripción
GET	/projects/:projectId/world-rules	Listar reglas
POST	/projects/:projectId/world-rules	Crear regla
PATCH	/projects/:projectId/world-rules/:id	Actualizar regla
DELETE	/projects/:projectId/world-rules/:id	Eliminar regla
Línea de tiempo
Método	Ruta	Descripción
GET	/projects/:projectId/timeline	Listar eventos
POST	/projects/:projectId/timeline	Crear evento
PATCH	/projects/:projectId/timeline/:id	Actualizar evento
DELETE	/projects/:projectId/timeline/:id	Eliminar evento
Guía de estilo
Método	Ruta	Descripción
GET	/projects/:projectId/style-guide	Obtener guía de estilo
PUT	/projects/:projectId/style-guide	Crear o actualizar guía de estilo
POST	/projects/:projectId/style-guide/chat	Chat conversacional para configurar estilo
POST	/projects/:projectId/style-guide/analyze	Analizar texto y extraer estilo automáticamente
Alertas de continuidad
Método	Ruta	Descripción
GET	/projects/:projectId/continuity-alerts	Listar alertas (filtrable por resolved)
PATCH	/projects/:projectId/continuity-alerts/:id/resolve	Marcar alerta como resuelta
PATCH	/projects/:projectId/continuity-alerts/:id/dismiss	Descartar alerta
Dashboard
Método	Ruta	Descripción
GET	/dashboard	Estadísticas globales del usuario
IA — Acciones narrativas
Método	Ruta	Descripción
POST	/ai/context-summary	Generar resumen del contexto de una escena
POST	/ai/continue-scene	Continuar escena (genera HTML para TipTap)
POST	/ai/rewrite-selection	Reescribir texto seleccionado con instrucción
POST	/ai/review-coherence	Revisar escena vs memoria canónica → JSON con issues
POST	/ai/extract-memory	Extraer ítems de memoria sugeridos de una escena
POST	/ai/check-contradiction	Verificar si una instrucción contradice la memoria
POST	/ai/free-chat	Chat libre con el agente sobre el proyecto
POST	/ai/test-builtin	Testear la conexión con el Gemini integrado
Credenciales de IA — Por proyecto
Método	Ruta	Descripción
GET	/projects/:projectId/ai-credentials	Listar claves del proyecto
POST	/projects/:projectId/ai-credentials	Guardar clave para este proyecto
PATCH	/projects/:projectId/ai-credentials/:id	Actualizar (activar, cambiar modelo)
DELETE	/projects/:projectId/ai-credentials/:id	Eliminar clave
POST	/projects/:projectId/ai-credentials/test	Testear clave guardada
Credenciales de IA — Globales
Método	Ruta	Descripción
GET	/ai-credentials	Listar claves globales del usuario
POST	/ai-credentials	Guardar clave global
PATCH	/ai-credentials/:id	Activar o actualizar clave global
DELETE	/ai-credentials/:id	Eliminar clave global
POST	/ai-credentials/test	Testear clave global
Salud
Método	Ruta	Descripción
GET	/health	Health check del servidor
6. Sistema de IA
Proveedores disponibles
Proveedor	Clave requerida	Modelos soportados
Gemini (oficial)	Sí — requiere clave	gemini-2.5-flash (default), 2.5-pro, 2.0-flash, 1.5-flash, 1.5-pro
Google Gemini (personal)	Sí — AIzaSy... (Google AI Studio)	Mismos modelos
OpenAI	Sí — sk-proj-... (OpenAI Platform)	gpt-4o-mini, gpt-4o, gpt-4-turbo, o4-mini
Anthropic Claude	Sí — sk-ant-... (Anthropic Console)	claude-3-5-haiku, claude-3-5-sonnet, claude-opus-4-5, claude-3-opus
Archivos del sistema de IA
artifacts/api-server/src/lib/ai/
├── geminiProvider.ts      # Proveedor Gemini (integrado + personalizado)
├── openaiProvider.ts      # Proveedor OpenAI
├── anthropicProvider.ts   # Proveedor Anthropic
├── embeddingService.ts    # Servicio de embeddings (siempre usa Gemini integrado)
├── contextAssembler.ts    # Ensambla el contexto narrativo + buildSystemPrompt
├── prompts.ts             # Todos los user prompts del agente
└── types.ts               # Tipos compartidos (NarrativeContext, etc.)

Flujo de una petición de escritura (ej: continuar escena)
Frontend (SceneEditor)
    │
    ├─ POST /api/ai/continue-scene
    │     { projectId, sceneId, chapterId, instruction }
    │
    └─ Backend (ai.ts)
          │
          ├─ verifyProject + verifySceneOwnership  ← seguridad
          │
          ├─ getProviderForProject(projectId, userId)
          │     ├─ Busca clave con isDefault=true en proyecto
          │     ├─ Si no → busca clave global (projectId IS NULL)
          │     └─ Si no → geminiProvider (integrado, gratis)
          │
          ├─ assembleContext(sceneId, chapterId, projectId, instruction)
          │     ├─ Carga escena actual, capítulo, libro, proyecto
          │     ├─ fetchRelevantCharacters(projectId, queryEmbedding)
          │     │     └─ pgvector cosine similarity → top 15 más relevantes
          │     ├─ fetchRelevantLocations(projectId, queryEmbedding)
          │     │     └─ pgvector cosine similarity → top 8 más relevantes
          │     ├─ fetchRelevantMemory(projectId, queryEmbedding)
          │     │     └─ pgvector cosine similarity → top 25 canónicos
          │     └─ Escena anterior + siguiente (para coherencia narrativa)
          │
          ├─ buildSystemPrompt(ctx)  ← incluye estilo, personajes, memoria, etc.
          ├─ buildContinueScenePrompt(ctx, instruction)
          │
          └─ provider.generateText(systemPrompt, userPrompt)
                └─ Respuesta HTML → guardada como scene_version (status: pending)

Sistema de embeddings (memoria vectorial)
Modelo: text-embedding-004 de Google Gemini (768 dimensiones)
Siempre usa el Gemini integrado — independiente de la clave de IA configurada
Se genera de forma asíncrona (fire-and-forget) al crear/editar: personajes, lugares, ítems de memoria
Búsqueda: operador <=> de pgvector (distancia coseno) con fallback a top-N si no hay embeddings
Cifrado de claves de API
Algoritmo: AES-256-GCM (autenticado, resistente a manipulación)
Clave de cifrado: Variable de entorno ENCRYPTION_KEY (hex de 32 bytes)
Formato almacenado: iv_hex:auth_tag_hex:ciphertext_hex
Archivo: artifacts/api-server/src/lib/encryption.ts
Las claves nunca se envían al frontend en texto plano
7. Frontend — Páginas y componentes
Rutas de la SPA
Ruta	Componente	Descripción
/	HomeRedirect	Redirige a /dashboard o /sign-in según auth
/sign-in	SignInPage	Pantalla de login (Clerk embebido)
/sign-up	SignUpPage	Registro (Clerk embebido)
/dashboard	Dashboard	Panel de proyectos
/projects/:id	Editor	Editor principal de escritura
/projects/:id/settings	ProjectSettings	Ajustes del proyecto
/settings	SettingsPage	Ajustes globales del usuario
*	NotFound	404
Página: Dashboard (/dashboard)
Muestra todos los proyectos del usuario con:

Cards de proyecto con tipo, estado, fecha de actualización
Buscador en tiempo real
Filtro por tipo (novela, saga, guion, etc.)
Estadísticas globales (palabras totales, libros, capítulos)
Modal de creación de nuevo proyecto
Menú de contexto por proyecto (abrir, ajustes, archivar, eliminar)
Página: Editor (/projects/:id)
El editor principal es una interfaz de 3 paneles (estilo Scrivener):

┌──────────────────────────────────────────────────────────────┐
│  Header (logo, LangToggle, ThemeToggle, UserMenu)            │
├───────────────┬──────────────────────────┬───────────────────┤
│               │                          │                   │
│  StructureTree│     SceneEditor          │   RightPanel      │
│  (árbol de    │  (TipTap editor +        │   (tabs: AI,      │
│  proyecto)    │   WordCount, Status)     │   Memoria,        │
│               │                          │   Personajes,     │
│               │                          │   Continuidad,    │
│               │                          │   Estilo,         │
│               │                          │   Notas,          │
│               │                          │   Timeline)       │
└───────────────┴──────────────────────────┴───────────────────┘

Componentes del editor
Componente	Descripción
StructureTree.tsx	Árbol colapsable Proyecto→Libro→Capítulo→Escena con CRUD inline
SceneEditor.tsx	Editor TipTap con toolbar, conteo de palabras, guardado automático
RightPanel.tsx	Panel derecho con navegación por tabs
AiPanel.tsx	Panel de IA: continuar, reescribir, revisar, chat, versiones
MemoryPanel.tsx	Gestión de ítems de memoria (sugeridos/canónicos/descartados)
ContinuityPanel.tsx	Alertas de continuidad con opciones de resolver/descartar
StylePanel.tsx	Visualización y edición de la guía de estilo
NotesPanel.tsx	Notas libres por escena
TimelinePanel.tsx	Línea de tiempo del proyecto
ChapterView.tsx	Vista de capítulo con lista de escenas
ImportDialog.tsx	Importar contenido externo
Editor TipTap (SceneEditor)
Extensiones: Starter Kit, Placeholder, Typography, CharacterCount, BubbleMenu
Guardado automático con debounce (3 segundos tras dejar de escribir)
Sanitización HTML con DOMPurify antes de enviar/mostrar
Conteo de palabras en tiempo real
BubbleMenu para acciones rápidas de IA sobre texto seleccionado
Página: Settings (/settings)
Layout de sidebar + panel de contenido.

Secciones:

Apariencia — Selector visual de tema (3 tarjetas: Claro / Oscuro / Sistema)
Idioma — Selector visual de idioma (tarjetas con bandera: ES / EN)
IA — Gestión de clave global de IA (misma lógica que project settings pero sin projectId)
Página: Project Settings (/projects/:id/settings)
Layout de sidebar + panel de contenido.

Secciones:

Proyecto — Nombre, descripción, tipo, idioma primario del proyecto
IA — Gestión de clave específica del proyecto + herencia de clave global
Componente: AiSettingsSection
Componente compartido entre /settings y /projects/:id/settings.

En modo global (sin projectId):

Muestra proveedor activo (clave global o Gemini integrado)
Lista claves globales inactivas
Formulario de 3 pasos: proveedor → clave → modelo
Badge "Global" en claves sin proyecto
En modo proyecto (con projectId):

Muestra proveedor efectivo con badge de scope ("Este proyecto" o "Global")
Puede guardar como clave de proyecto o como clave global
Hereda automáticamente la clave global si no hay una propia
Layout: AppLayout
Header fijo de 56px con:

Logo AEVIUM + nombre (link a /dashboard)
LangToggle — dropdown ES/EN (guarda en perfil)
ThemeToggle — dropdown Dark/Light/System (guarda en perfil)
UserMenu — avatar Clerk + nombre + links (ajustes, cerrar sesión)
8. Autenticación y seguridad
Clerk
Tenant: Cuenta de Clerk (requiere PUBLISHABLE_KEY y SECRET_KEY en modo dev y prod)
Flujo: Email + Google OAuth
Proxy: Configurado via VITE_CLERK_PROXY_URL para que las peticiones de Clerk pasen por el dominio de la app (no por clerk.com directamente)
Personalización: Tema oscuro con colores de AEVIUM (#A935EB como color primario)
Frontend: @clerk/react v6, Show para guards de auth
Backend: @clerk/express, middleware requireAuth, getUserId(req) extrae el userId
Seguridad de datos
Todos los endpoints verifican que el recurso pertenece al usuario autenticado
Las cascades de borrado en DB evitan datos huérfanos
Claves API cifradas con AES-256-GCM (nunca texto plano en DB ni red)
pnpm workspace tiene minimumReleaseAge: 1440 — protección contra supply-chain attacks
Variables protegidas
ENCRYPTION_KEY — Solo en servidor, nunca expuesta al frontend
NEON_DATABASE_URL — Solo en servidor
Las claves de Clerk son públicas en frontend (VITE_CLERK_PUBLISHABLE_KEY) y secretas en backend
9. Internacionalización (i18n)
Idiomas: Español (default) + Inglés
Sistema: Contexto React propio (useI18n) — sin librería externa
Archivos:
artifacts/aevium/src/locales/es/common.json
artifacts/aevium/src/locales/en/common.json
Persistencia: El idioma seleccionado se guarda en profiles.language y se hidrata al cargar la app
En backend: Los prompts de IA detectan el idioma del proyecto y responden en consecuencia
Nota: Los user prompts del agente están actualmente solo en español (EN pendiente)
10. Sistema de temas
Librería: next-themes
Opciones: dark (default) | light | system
Persistencia: localStorage (aevium-theme) + sincronización con profiles.theme
Hidratación: El ProfileHydrator en App.tsx lee el perfil y aplica tema e idioma al cargar
Clerk: Appearance configurada para adaptarse al tema (siempre dark por variables hardcoded)
11. Paleta de colores y diseño
Colores principales
Color	Hex	Uso
Púrpura	#A935EB	Color primario — botones, selecciones, highlights
Lima	#87DB20	Color de acento — éxito, indicadores positivos
Negro profundo	#08080A	Fondo principal en modo oscuro
Variables CSS (modo oscuro, base)
--primary: hsl(278, 83%, 56%)    /* #A935EB */
--background: hsl(240, 11%, 4%)  /* #08080A */
--foreground: hsl(0, 0%, 98%)    /* casi blanco */

Tipografía
Fuente: Geist (Google Fonts) — usada también en el login de Clerk
Componentes UI
shadcn/ui sobre Radix UI — accesible por defecto
Radix primitives: accordion, dialog, dropdown, select, tabs, toast, tooltip, etc.
class-variance-authority + tailwind-merge para variantes de componentes
12. Flujos de usuario
Flujo: Primer uso
1. Registro (email o Google) → Clerk
2. Redirección a /dashboard
3. ProfileHydrator hidrata tema (dark) e idioma (es) desde el perfil
4. "Nuevo proyecto" → modal con nombre y tipo
5. Redirección a /projects/:id (editor vacío)
6. Panel de IA ofrece configurar la guía de estilo

Flujo: Escritura con IA asistida
1. Autor escribe texto en SceneEditor (TipTap)
2. Hace clic en "Continuar" en AiPanel
3. Frontend envía POST /api/ai/continue-scene
4. Backend:
   a. Selecciona proveedor (proyecto > global > integrado)
   b. Genera query embedding del contexto actual
   c. Busca personajes/lugares/memoria semánticamente relevantes
   d. Construye system prompt con todo el contexto
   e. Llama a la IA
   f. Guarda scene_version (status: pending)
   g. Devuelve texto HTML
5. Frontend muestra propuesta en panel de versiones
6. Autor acepta → se aplica al editor
7. Autor rechaza → se marca como rejected

Flujo: Gestión de memoria narrativa
1. Autor escribe escena y hace clic "Extraer memoria"
2. Backend analiza texto y devuelve sugerencias (status: suggested)
3. Autor revisa en MemoryPanel:
   - Aprobar → status: canonical (la IA lo usará en adelante)
   - Rechazar → status: discarded (ignorado)
4. Al escribir futuras escenas, la IA busca en la memoria canónica
   los ítems más relevantes semánticamente y los incluye en el contexto

Flujo: Detección de contradicciones
1. Autor da instrucción "En la escena X quiero que el personaje Y haga Z"
2. Frontend envía POST /api/ai/check-contradiction
3. IA compara con memoria canónica
4. Si hay contradicción → devuelve descripción + opciones de resolución
5. Autor decide cómo proceder antes de escribir

Flujo: Configuración de clave de IA
Opción A — Clave global (una sola vez):
1. /settings → IA
2. "Conectar proveedor" → elegir Gemini/OpenAI/Claude
3. Pegar clave API + seleccionar modelo
4. Guardar → todas las sesiones de escritura la usan
Opción B — Clave por proyecto:
1. /projects/:id/settings → IA
2. "Conectar proveedor" → "Solo este proyecto"
3. Pegar clave + modelo
4. Guardar → solo ese proyecto usa esa clave
Fallback automático: proyecto → global → Gemini integrado (gratis)

13. Variables de entorno y secretos
Backend (api-server)
Variable	Tipo	Descripción
ENCRYPTION_KEY	Secreto	Hex de 32 bytes para AES-256-GCM
NEON_DATABASE_URL	Secreto	URL de conexión a PostgreSQL (Neon)
DATABASE_URL	Env	URL de PostgreSQL (Neon o Local)
NODE_ENV	Env	development | production
PORT	Env	Puerto del servidor (8080 en dev)
Frontend (aevium)
Variable	Tipo	Descripción
VITE_CLERK_PUBLISHABLE_KEY	Env	Clave pública de Clerk
VITE_CLERK_PROXY_URL	Env	URL del proxy de Clerk
VITE_API_URL	Env	URL base del API (en prod)
BASE_URL	Env (Vite)	Prefijo de path de la app
14. Estado actual y pendientes
Implementado ✅
 Monorepo pnpm con 3 packages (aevium, api-server, db)
 Autenticación Clerk completa (login, logout, guards)
 CRUD completo: proyectos, libros, capítulos, escenas
 CRUD completo: personajes, lugares, reglas del mundo
 CRUD completo: memoria narrativa, línea de tiempo
 Editor TipTap con guardado automático
 Sistema de versiones de escenas (propuesta → aceptar/rechazar)
 IA: continuar escena, reescribir selección, revisar coherencia
 IA: extraer memoria, detectar contradicciones, chat libre
 Guía de estilo: CRUD + chat conversacional + análisis de texto
 Alertas de continuidad (crear, resolver, descartar)
 Memoria vectorial (pgvector, text-embedding-004, 768d)
 Búsqueda semántica en personajes, lugares y memoria
 Multi-proveedor: Gemini, OpenAI, Anthropic
 Claves globales y por proyecto con jerarquía de fallback
 Cifrado AES-256-GCM de claves API
 Dashboard con estadísticas y búsqueda
 Tema dark/light/system con persistencia
 i18n ES/EN con persistencia
 Settings rediseñados con sidebar (Apariencia, Idioma, IA)
 Project settings rediseñados con sidebar (Proyecto, IA)
 Paleta de colores #A935EB / #87DB20 / #08080A
Pendiente / Mejoras identificadas 🔄
 Directrices de comportamiento en los system prompts del agente
 Restricción de scope en el chat libre (solo temas de escritura)
 User prompts en inglés (actualmente solo ES)
 Instrucción explícita de no inventar hechos canónicos no presentes en memoria
 Panel de worldbuilding en el editor (actualmente solo CRUD por API)
 Página de términos de uso / política de privacidad
 Exportación de proyectos (EPUB, DOCX, PDF)
 Colaboración en tiempo real (multi-autor)
 Modo offline / PWA
 Tests automatizados E2E
Documento generado automáticamente a partir del código fuente. Mayo 2026.