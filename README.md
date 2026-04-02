# Writers Assistant

An AI-powered creative writing tool for authors working on novels and long-form stories. Writers Assistant combines a rich text editor with AI chat, context checking, text prediction, and a structured story bible — all designed to help you stay consistent and productive across complex narratives.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Data Storage](#data-storage)
- [Configuration](#configuration)
- [Scripts](#scripts)

## Overview

Writers Assistant is a full-stack web application with two main surfaces:

**Chapter Editor** — A Tiptap-based rich text editor for writing chapters, organized into parts. The editor supports inline AI text prediction, and a side panel with three tabs: AI chat (context-aware conversation about your chapter), proposals (AI-suggested text changes you can accept/reject with a diff view), and context checking (flags inconsistencies against your story bible).

**Story Bible** — A structured reference for your story's world. It has dedicated editors for characters, environment/settings, events timeline, objects, and metadata. The story bible also has its own AI chat and proposal system so you can ask questions or get suggested updates to your world-building.

All AI features are powered by OpenAI (gpt-4o) with system prompts tailored to each use case — chat, context checking, fixing, predicting, and proposing.

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Next.js Frontend  │  HTTP   │   FastAPI Backend    │
│   (React / TS)      │◄───────►│   (Python / Async)   │
│   localhost:3000     │         │   localhost:8000      │
└─────────────────────┘         └──────────┬──────────┘
                                           │
                                ┌──────────┴──────────┐
                                │                     │
                                ▼                     ▼
                         ┌────────────┐      ┌──────────────┐
                         │  File-based │      │  OpenAI API  │
                         │  JSON Store │      │  (gpt-4o)    │
                         │  /data/     │      └──────────────┘
                         └────────────┘
```

The frontend communicates with the backend via REST API calls. The backend persists all project data as JSON files on disk (no database required) and streams AI responses from the OpenAI API.

## Tech Stack

### Backend

| Component | Technology |
|-----------|-----------|
| Framework | FastAPI 0.135 |
| Runtime | Python 3.10+ with uvicorn/uvloop |
| AI | OpenAI API (gpt-4o) via `openai` SDK |
| Validation | Pydantic v2 |
| Settings | pydantic-settings with `.env` support |
| HTTP client | httpx |

### Frontend

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Editor | Tiptap 3 (ProseMirror-based) |
| State | Zustand 5 |

## Prerequisites

- **Python 3.10+** and `pip`
- **Node.js 18+** and `npm`
- **OpenAI API key** with access to the gpt-4o model

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:Varun-D-Mehta/Writers-Assistant.git
cd Writers-Assistant
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key:
#   OPENAI_API_KEY=sk-...
#   DATA_DIR=./data
#   CORS_ORIGINS=http://localhost:3000

# Start the dev server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs are at `/docs` (Swagger) and `/redoc`.

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
Writers-Assistant/
├── LICENSE
├── README.md
├── backend/
│   ├── main.py                        # FastAPI app entry point, CORS, router registration
│   ├── config.py                      # Pydantic settings (env vars)
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/projects/                 # File-based project storage
│   └── app/
│       ├── prompts/                   # System prompts for each AI feature
│       │   ├── chat_system.py
│       │   ├── context_check_system.py
│       │   ├── fix_system.py
│       │   ├── predict_system.py
│       │   ├── propose_system.py
│       │   ├── story_bible_chat_system.py
│       │   └── story_bible_context_check_system.py
│       ├── routers/                   # API route handlers
│       │   ├── projects.py            # Project CRUD
│       │   ├── parts.py               # Story parts
│       │   ├── chapters.py            # Chapters
│       │   ├── story_bible.py         # Story bible + chat
│       │   ├── chat.py                # Chapter-level AI chat
│       │   ├── proposals.py           # Proposal management
│       │   ├── context_check.py       # Consistency validation
│       │   ├── fix.py                 # AI text fixing
│       │   ├── predict.py             # Inline text prediction
│       │   ├── propose.py             # AI proposal generation
│       │   ├── export.py              # Project export
│       │   └── import_project.py      # PDF import
│       ├── schemas/                   # Pydantic request/response models
│       │   ├── project.py
│       │   ├── part.py
│       │   ├── chapter.py
│       │   ├── story_bible.py
│       │   ├── chat.py
│       │   ├── context_check.py
│       │   └── proposal.py
│       └── services/                  # Business logic
│           ├── ai_service.py          # OpenAI integration + streaming
│           ├── chat_service.py        # Chat context assembly
│           ├── context_check_service.py
│           ├── fix_service.py
│           ├── search_service.py
│           └── storage.py             # JSON file I/O helpers
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    └── src/
        ├── app/                       # Next.js App Router pages
        │   ├── layout.tsx             # Root layout
        │   ├── page.tsx               # Project list (home)
        │   └── projects/[projectSlug]/
        │       ├── page.tsx           # Project overview
        │       ├── characters/        # Story bible pages
        │       ├── environment/
        │       ├── events/
        │       ├── objects/
        │       └── parts/[partSlug]/chapters/[chapterSlug]/
        │           └── page.tsx       # Chapter editor
        ├── components/
        │   ├── editor/                # Tiptap editor + toolbar + predictions
        │   ├── layout/                # Sidebar navigation
        │   ├── side-panel/            # Chat, proposals, context check tabs
        │   ├── story-bible/           # Story bible section editors
        │   └── ui/                    # Shared components (DiffView, etc.)
        ├── hooks/                     # Custom React hooks
        ├── stores/                    # Zustand stores (chat, proposals, context check)
        └── lib/
            ├── api.ts                 # Fetch wrapper
            ├── constants.ts           # API base URL
            └── types.ts               # TypeScript interfaces
```

## API Reference

All endpoints are prefixed with `/api`. The backend registers 11 routers:

| Prefix | Description |
|--------|-------------|
| `/api/projects` | List, create, update, delete projects |
| `/api/projects/{slug}/parts` | CRUD for story parts within a project |
| `/api/projects/{slug}/parts/{part}/chapters` | CRUD for chapters within a part |
| `/api/projects/{slug}/story-bible` | Read/update story bible; story bible chat |
| `/api/projects/{slug}/parts/{part}/chapters/{ch}/chat` | Chapter-level AI chat (streaming) |
| `/api/projects/{slug}/parts/{part}/chapters/{ch}/proposals` | Manage saved proposals for a chapter |
| `/api/context-check` | Run AI consistency check against story bible |
| `/api/predict` | Get inline text prediction for the editor |
| `/api/fix` | AI-powered text correction |
| `/api/propose` | Generate AI text change proposals |
| `/api/export` | Export a project |
| `/api/import` | Import a project from PDF |
| `/api/health` | Health check (`GET`) |

Full interactive documentation is available at `http://localhost:8000/docs` when the backend is running.

## Data Storage

Projects are stored as a hierarchy of JSON files under `backend/data/projects/`. No database is needed.

```
data/projects/{project-slug}/
├── project.json                          # Title, logo, timestamps
├── story-bible/
│   ├── story_bible.json                  # Characters, environment, events, objects
│   └── chat_history.json                 # Story bible chat log
└── parts/{part-slug}/
    ├── part.json                         # Part title, order
    └── chapters/{chapter-slug}/
        ├── chapter.json                  # Title, order, word count
        ├── content.json                  # Tiptap document (ProseMirror JSON)
        ├── chat_history.json             # Chapter chat log
        └── proposals.json                # Saved proposals
```

To back up your work, simply copy the `data/projects/` directory. To move a project between machines, copy its folder and drop it into the same location on the target.

## Configuration

### Backend environment variables (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | *(required)* |
| `DATA_DIR` | Path to the project data directory | `./data` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` |

### Frontend environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000` |

## Scripts

### Backend

```bash
# Start dev server with hot reload
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm start        # Serve production build
npm run lint     # Run ESLint
```

## License

MIT — see [LICENSE](./LICENSE) for details.
