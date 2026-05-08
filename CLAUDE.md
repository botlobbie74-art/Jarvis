# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Jarvis is an AI-driven personal assistant and app builder with a multi-agent system.

### Backend (`/backend`)
- **Framework**: FastAPI (Python)
- **Database**: Supabase (Postgres)
- **Authentication**: JWT-based, supports email/password and Google/GitHub OAuth.
- **Core Components**:
    - `server.py`: Main API entry point, handling auth, chat, projects, billing, and plugin management.
    - `llm_router.py`: Orchestrates LLM calls across different providers and roles.
- **Multi-Agent System**:
    - **CEO Agent**: Higher-level coordinator that plans projects and delegates tasks.
    - **Specialists**: Coder, Architect, Backend, Frontend, Infra, Security, UX, QA, etc.
    - **Workflow**: User request $\rightarrow$ CEO $\rightarrow$ Specialized Agent $\rightarrow$ Code/Action $\rightarrow$ Verification.
- **Integrations**: Stripe (Billing), GitHub (Repo deployment), Google Workspace, Telegram.

### Frontend (`/frontend`)
- **Framework**: React 19 with Tailwind CSS
- **Build Tool**: Craco (React Scripts)
- **Key Libraries**: `@supabase/supabase-js`, `axios`, `react-router-dom`, `lucide-react`, `radix-ui`.
- **Features**: User dashboard, Project builder interface, Persona management, Billing/Credits view.

## Common Commands

### Backend Development
- **Run Server**: `python backend/server.py` (or via `uvicorn` if applicable)
- **Dependencies**: `pip install -r backend/requirements.txt`

### Frontend Development
- **Install Dependencies**: `yarn install` or `npm install`
- **Start Development**: `yarn start` or `npm start`
- **Build**: `yarn build` or `npm build`
- **Test**: `yarn test` or `npm test`

### Testing
- **Backend Tests**: `python backend_test.py` or `pytest tests/`
