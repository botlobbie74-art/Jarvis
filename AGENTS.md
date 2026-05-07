# AGENTS.md

This document provides essential information for AI agents working within this repository.

## Project Overview

This is a full-stack application consisting of:
*   A Python FastAPI backend (`backend/`) serving as the core API and LLM router.
*   A React frontend (`frontend/`) providing the user interface.
*   A Node.js WhatsApp integration (`whatsapp/`) for interacting with WhatsApp.

## Essential Commands

### Root Directory

*   **List all files and directories:** `ls -RF`

### Backend (Python)

*   **Directory**: `backend/`
*   **Dependencies**: `pip install -r backend/requirements.txt`
*   **Run**: `uvicorn backend.server:app --reload`
*   **Tests**: `pytest backend_test.py`

### Frontend (React)

*   **Directory**: `frontend/`
*   **Dependencies**: `cd frontend && yarn install`
*   **Run**: `cd frontend && yarn start`
*   **Build**: `cd frontend && yarn build`
*   **Tests**: `cd frontend && yarn test`

### WhatsApp Integration (Node.js)

*   **Directory**: `whatsapp/`
*   **Dependencies**: `cd whatsapp && npm install`
*   **Run**: `cd whatsapp && npm start`

## Code Organization and Architecture

### Backend (`backend/`)

*   **`server.py`**: Main FastAPI application, defining API endpoints, authentication (JWT), and integrating with Supabase, Stripe, and the LLM router.
*   **`llm_router.py`**: Manages LLM calls, supporting multiple providers (Gemini, Cerebras, Groq, Mistral, Cohere, Together, OpenRouter) with role-based priority and a cooldown mechanism.
*   **`requirements.txt`**: Python dependencies for the backend, including `fastapi`, `uvicorn`, `supabase`, `psycopg2-binary`, `stripe`, `PyGithub`.
*   **`schema.sql` (and `_v2`, `_v3`, `_v4`)**: Database schema definitions, likely for Supabase PostgreSQL.
*   **`backend_test.py`**: Unit/integration tests for the backend.

### Frontend (`frontend/`)

*   **`src/App.js`**: Main React component, setting up routing with `react-router-dom`, authentication (`AuthContext`), and theme management (`ThemeContext`).
*   **`src/pages/`**: Contains page-level components (e.g., `MarketingHome`, `Landing`, `Dashboard`).
*   **`src/components/`**: Reusable UI components, often built using `shadcn/ui` (Radix UI, Tailwind CSS).
*   **`src/context/`**: React Context providers for global state management (e.g., `AuthContext`, `ThemeContext`).
*   **`package.json`**: Frontend dependencies, including `react`, `react-router-dom`, `@supabase/supabase-js`, `axios`, `tailwindcss`, `@radix-ui` components. Uses `craco` for CRA customization.
*   **`craco.config.js`**, `tailwind.config.js`, `postcss.config.js`: Configuration files for `CRACO`, `Tailwind CSS`, and `PostCSS`.

### WhatsApp Integration (`whatsapp/`)

*   **`server.js`**: Node.js Express server for handling WhatsApp interactions using `whatsapp-web.js`. Manages user sessions, QR code generation for authentication, and Supabase integration for plugin status.
*   **`package.json`**: Node.js dependencies, including `express`, `whatsapp-web.js`, `@supabase/supabase-js`, `dotenv`. Configured to use ES Modules.

## Naming Conventions and Style Patterns

*   **Python**: Follows standard Python conventions (snake_case for variables/functions, PascalCase for classes). Uses type hints.
*   **JavaScript/React**: Follows common JavaScript/React conventions (camelCase for variables/functions, PascalCase for components). Uses ES Modules.
*   **API Endpoints**: RESTful principles are generally followed (e.g., `/api/auth/signup`, `/api/chat`).

## Testing Approach

*   **Backend**: `pytest` is used for testing Python code. Tests are located in `backend_test.py` and potentially `tests/`.
*   **Frontend**: `craco test` command suggests that `react-scripts test` (which uses Jest and React Testing Library) is used, customized by `craco`.

## Important Gotchas and Non-Obvious Patterns

*   **Environment Variables**: Crucial for configuring all parts of the application (Supabase, JWT secrets, LLM API keys, Stripe, etc.). The backend `.env` file is also used by the WhatsApp service.
*   **LLM Router Logic**: The `llm_router.py` dynamically selects LLM providers based on `role_priority` and applies cooldowns. Agents should be aware that the choice of LLM for a given task (`planner`, `coder`, `chat`, `tester`, `reviewer`) is not static.
*   **Frontend `craco`**: The `craco.config.js` file customizes the Create React App build process, which might be non-obvious to agents unfamiliar with `craco`.
*   **WhatsApp Session Management**: WhatsApp sessions are managed in-memory per `user_id` and stored in `/tmp/wa-sessions`. This is relevant for debugging session-related issues.
*   **Supabase Realtime**: The WhatsApp integration uses Supabase Realtime for its connection.
