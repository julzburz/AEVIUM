# AEVIUM

AEVIUM is an open-source, AI-powered narrative writing assistant designed for serious fiction authors. Think of it as a modern 'Scrivener' with an integrated AI co-pilot. Built as a full-stack monorepo (React, Node.js, PostgreSQL/pgvector), it uses vector embeddings to maintain a canonical 'narrative memory,' detecting plot holes and ensuring character consistency across hundreds of pages. 

## Features

- **Hierarchical Organization**: Project → Book → Chapter → Scene structure, tailored for long-form fiction.
- **Narrative Memory (pgvector)**: The AI automatically remembers characters, locations, events, and world rules to keep context consistent.
- **Active Coherence**: Detects contradictions before the author commits to them, using semantic search.
- **Style Guides**: Learns and respects the author's narrative voice and tone.
- **Multi-Provider AI**: Supports Gemini, OpenAI, and Anthropic Claude for generating text, rewriting, and analyzing context.

## Stack

- **Frontend**: React 19, Vite, TailwindCSS, TipTap Editor, Framer Motion
- **Backend**: Node.js, Express 5, Drizzle ORM, Zod
- **Database**: PostgreSQL with `pgvector` extension for semantic search
- **Auth**: Clerk

## Setup

1. Install dependencies with `pnpm install`
2. Configure your environment variables in `.env`
3. Run the development servers:
   - `pnpm --filter @workspace/api-server run dev` (Backend)
   - `pnpm --filter @workspace/aevium run dev` (Frontend)

## License
MIT
