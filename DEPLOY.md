# Jarvis Agent — Production Deployment

Autonomous AI engineer that plans, codes, tests, and ships apps to GitHub.

## Architecture

| Service | Platform | Purpose |
|---------|----------|---------|
| Frontend (React) | **Vercel** | Static SPA, CDN |
| Backend (FastAPI) | **Railway** | API, LLM router, GitHub integration |
| WhatsApp microservice (Node) | **Railway** (separate service) | whatsapp-web.js + Puppeteer |
| Database | **Supabase** | Postgres + Auth |
| LLMs | Multi-provider free tier | Gemini, Groq, Cerebras, Mistral, Cohere, Together, OpenRouter |
| Payments | **Stripe** | Subscriptions (Starter / Pro) |

## Domains

- `https://jarvisagent.app` → Vercel (frontend)
- `https://www.jarvisagent.app` → Vercel
- `https://api.jarvisagent.app` → Railway (FastAPI backend)

## Deploy: Frontend (Vercel)

1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import the repo
3. **Settings:**
   - Framework: Create React App
   - Root directory: `./` (uses `vercel.json` at repo root)
   - Build command: `cd frontend && yarn install && yarn build` (in `vercel.json`)
   - Output: `frontend/build`
4. **Env vars:**
   - `REACT_APP_BACKEND_URL=https://api.jarvisagent.app`
5. Settings → Domains → Add `jarvisagent.app` + `www.jarvisagent.app`
6. Update DNS: `A @ 76.76.21.21` and `CNAME www cname.vercel-dns.com`

## Deploy: Backend (Railway)

1. railway.app → New Project → Deploy from GitHub
2. Service 1 — **Backend API**:
   - Dockerfile: `Dockerfile.backend`
   - Or Builder: Nixpacks → Root: `backend/`, start: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **All env vars from `backend/.env`** (paste them in Variables)
   - Networking → Custom Domain → `api.jarvisagent.app`
3. Service 2 — **WhatsApp**:
   - Dockerfile: `Dockerfile.whatsapp`
   - Same project, separate service
   - Internal domain (no public expose), or `wa.jarvisagent.app` if you want
   - Set `WA_PORT=8002`
4. In Backend service env, set `WA_SERVICE_URL=http://<wa-service-name>.railway.internal:8002`
5. DNS: `CNAME api <project>.up.railway.app`

## Provider URL configuration (one-time)

- **Google Cloud Console** → OAuth client:
  - Authorized JS origins: `https://jarvisagent.app`, `https://www.jarvisagent.app`
  - Authorized redirect URIs: `https://api.jarvisagent.app/api/auth/google/callback`
- **GitHub OAuth App**:
  - Homepage: `https://jarvisagent.app`
  - Callback: `https://api.jarvisagent.app/api/auth/github/callback`
- **Supabase** → Auth → URL Config:
  - Site URL: `https://jarvisagent.app`
  - Redirect URLs: `https://jarvisagent.app/**`, `https://api.jarvisagent.app/**`
- **Stripe** → Webhooks → Add endpoint:
  - URL: `https://api.jarvisagent.app/api/billing/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

## Supabase setup (one-time)

Run in SQL Editor in this order:
- `backend/schema.sql`
- `backend/schema_v2.sql`
- `backend/schema_v3.sql`

## Local dev

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn server:app --reload --port 8001

# WhatsApp
cd whatsapp && yarn install && node server.js

# Frontend
cd frontend && yarn install && yarn start
```

## Environment variables (production)

Copy `backend/.env` template — replace empty Stripe keys after creating products in Stripe.
