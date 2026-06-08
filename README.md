# 🖋️ AEVIUM

> **The Writer's Cockpit** — An open-source, AI-native narrative writing assistant designed for serious fiction authors. Think of it as a modern 'Scrivener' with a cognitive, vector-based AI co-pilot.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-24-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Postgres-pgvector-blue?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.45-orange?style=for-the-badge)](https://orm.drizzle.team/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

AEVIUM is a full-stack monorepo designed to help novelists organize and write long-form fiction. By leveraging **vector embeddings (pgvector)**, it maintains a canonical **"Narrative Memory"** that tracks characters, locations, worldbuilding rules, and timeline events scene-by-scene. It automatically analyzes your text to detect plot holes, timeline errors, or character status contradictions before you commit to them.

---

## 🌟 Key Features

*   **📚 Hierarchical Manuscript Organization**
    Organize your work cleanly: `Project` ➡️ `Book` ➡️ `Chapter` ➡️ `Scene`. Built for multi-book sagas and complex plot structures.
*   **🧠 Narrative Memory (pgvector)**
    Automatically extracts facts about your story (e.g., character status, secrets, relationships) and stores them in a semantic search vector space.
*   **🛡️ Active Coherence & Contradiction Detection**
    Warns you in real-time if a scene's content or your writing instructions contradict canonical memory (e.g., a character who died in Chapter 2 suddenly speaks in Chapter 5).
*   **🎭 Multi-Provider AI Routing**
    Fully interoperable out-of-the-box. Use **Google Gemini**, **OpenAI**, or **Anthropic Claude** to assist you in writing, rewriting, or auditing.
*   **✍️ Dynamic Style Guides**
    Automatically learns your narrative voice, POV rules, pacing, and vocabulary constraints to keep AI recommendations aligned with your specific style.
*   **📦 Built-in Sandbox**
    Includes a mockup sandbox project for testing and previewing UI components interactively in development.

---

## 🛠️ Technology Stack

### Frontend
*   **React 19** & **Vite**
*   **TailwindCSS** for layout & micro-animations
*   **TipTap Editor** (rich-text workspace)
*   **Framer Motion** (smooth panel transitions)

### Backend
*   **Node.js (Express 5)**
*   **Drizzle ORM** (database migrations & queries)
*   **Zod** for schema validation

### Services & DB
*   **PostgreSQL** with `pgvector` extension for semantic RAG
*   **Clerk** for user authentication and security proxying

---

## 📁 Repository Structure

```
AEVIUM/
├── artifacts/
│   ├── aevium/            # React 19 Frontend Web Application
│   ├── api-server/        # Express 5 backend API & AI provider routers
│   └── mockup-sandbox/    # Component playground sandbox
├── lib/
│   ├── api-client-react/  # Generated query hooks for the frontend
│   ├── api-spec/          # OpenAPI specifications and schema generation
│   ├── api-zod/           # Validated Zod schemas exported from spec
│   ├── db/                # PostgreSQL schemas, migrations, and Drizzle client
│   └── integrations-gemini-ai/ # High-performance Google Gemini wrapper
└── package.json           # Workspace configuration & pnpm scripts
```

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) v24 or higher
*   [pnpm](https://pnpm.io/) v11 or higher
*   A running **PostgreSQL** instance with the `pgvector` extension enabled (e.g., Supabase or Neon).

### 1. Installation
Clone the repository and install the dependencies:
```bash
pnpm install
```

### 2. Database Setup
Ensure your PostgreSQL database has `pgvector` active. In your DB, run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Environment Variables
Create a `.env` file inside `artifacts/api-server/` with the following variables:
```env
# Database Credentials
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Encryption (used for encrypting user API keys in DB)
# Must be a 64-character hex string (32 bytes)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Default AI credentials
GEMINI_API_KEY=your_default_gemini_api_key

# Server settings
PORT=5000
NODE_ENV=development
```

### 4. Database Migrations
Push the database schema directly to your dev database:
```bash
pnpm --filter @workspace/db run push
```

### 5. Running local development servers
You can start both the API server and the Frontend app concurrently:
```bash
# Launch backend API (on port 5000)
pnpm --filter @workspace/api-server run dev

# Launch frontend application (on port 3000)
pnpm --filter @workspace/aevium run dev
```

---

## 🧪 Development Utilities

*   **Type checking:** Verify TypeScript compilation across the entire monorepo:
    ```bash
    pnpm run typecheck
    ```
*   **API Code Generation:** Re-generate frontend hooks and Zod schemas from OpenAPI specifications:
    ```bash
    pnpm --filter @workspace/api-spec run codegen
    ```

---

## 📄 License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
