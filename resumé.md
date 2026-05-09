# Jarvis OS 2.0 - Résumé Complet du Projet

## 1. Fonctionnalités Principales
Jarvis OS 2.0 n'est pas qu'un assistant de code, c'est un véritable **système d'exploitation cognitif** capable d'exécuter des tâches en autonomie :
*   **App Builder Autonome** : Vous décrivez une application, Jarvis rédige le plan architectural (via le Tier GOD), code tous les composants, génère les tests (en parallèle via Shadow Worker), et pousse le projet final sur GitHub.
*   **Intégration d'Outils (Plugins / MCP)** : Accès direct à Google Workspace (Drive, Docs, Sheets), GitHub, Telegram (Bot direct 24/7), et recherches Web en temps réel.
*   **Tâches en Arrière-plan (Background Autonomy)** : Jarvis peut exécuter des tâches programmées pendant la nuit (ex: traitement de données, briefings matinaux).
*   **Édition UI Ultra-Rapide (Ghost Edit)** : Sur une prévisualisation "Live Preview", l'utilisateur donne une instruction simple ("Rendre le bouton bleu"). Jarvis applique un *snippet* patché en moins de 0.5s sans réécrire tout le fichier, grâce au modèle WORKER ultra-rapide.
*   **Self-Healing Loop** : Validation interne de chaque code généré (Vérification de la syntaxe par le Tier PRO, mock de terminal de compilation).

## 2. Hiérarchie des Modèles d'IA (Model Router)
Le routeur d'IA de Jarvis gère dynamiquement et silencieusement les modèles d'intelligence artificielle utilisés, sans intervention de l'utilisateur.
Le routeur choisit le modèle en se basant sur une matrice Qualité/Coût/Vitesse.

| Tier | Modèles Assignés | Rôle / Justification |
| :--- | :--- | :--- |
| **GOD** | `claude-3-opus-20240229` | **Planification initiale et Architecture globale**. Le modèle le plus intelligent, utilisé *exclusivement* pour les premières étapes stratégiques du Builder (agents `ceo`, `planner`). Coût élevé, d'où sa restriction. |
| **ELITE_VISUAL** | `gpt-4o` | **Conception visuelle**. Très performant sur le SVG, l'UI et la créativité visuelle (`ux`, `frontend`). |
| **ELITE_LOGIC** | `claude-3-5-sonnet-latest` | **Logique et Refactoring Python/Node**. Utilisé pour la précision structurelle du backend (`backend`, `refactor`, `security`). |
| **PRO** | `claude-3-haiku-20240307`, `gpt-4o-mini` | **Écriture de code standard et composants CSS**. Meilleur rapport qualité/prix pour la rédaction de fichiers (`coder`). |
| **WORKER** | `gemini-1.5-flash`, `codestral-latest` | **Tâches de routine, Parsing et Formatage**. Très rapide et très peu cher. Utilisé pour la génération de tests unitaires (Shadow Worker), le filtrage (Summary Buffer), ou la vérification syntaxique (`qa_test`). |
| **SLM** | `llama-3.3-70b`, `phi-3` (Local/Cloud) | **Micro-corrections syntaxiques**. Modèle quasi-gratuit (`bug_hunter`). |

## 3. Logique Économique et Gestion des Crédits
La plateforme repose sur un système de **crédits haute-marge** conçu pour être hautement rentable :
*   **Prix réels vs Prix utilisateurs** : Chaque interaction calcule le nombre de tokens Input/Output, multiplie par le coût réel de l'API (en USD), et applique une **Marge** définie selon le Tier (ex: x4 pour GOD, x12 pour WORKER).
*   **Règle des 90/10** : 90% des requêtes (parsing, petites éditions) sont gérées par les modèles WORKER/PRO (marge maximale), tandis que seulement 10% (planification) utilisent GOD.
*   **Budget Guard** : Avant de lancer une requête coûteuse sur le modèle GOD (ex: planification d'un grand projet), le système vérifie le solde. Si le coût dépasse 20% du solde de l'utilisateur, l'API bloque et demande une confirmation ("Cette tâche mobilise le Tier GOD et consommera X crédits...").
*   **Context Pruning (Summary Buffer)** : Pour réduire les coûts des longs historiques de Chat, l'agent WORKER résume automatiquement les 10 anciens messages en 3 points clés, réduisant la consommation des tokens d'entrée de 60%.

## 4. Hiérarchie des Agents (La Team Jarvis)
Jarvis n'est pas un seul assistant, c'est une entreprise virtuelle (protocole "CEO") constituée de rôles distincts :
1.  **CEO Agent** : Chef d'orchestre, attribue les rôles (Tier GOD).
2.  **CTO Agent** : Architecte technique (Backend, Frontend, Sécurité).
3.  **Product Manager Agent** : Gère l'expérience utilisateur, simule le comportement client (UX, Research).
4.  **Orchestrator Kernel** : Maintient le Graphe de dépendances, gère la mémoire (`project_map.json`), et achemine le contexte.
5.  **Autonomous QA Swarm** : Agents tournant en parallèle (Shadow Workers) pour tester, chercher des bugs et vérifier les performances.

## 5. Tarification & Verrouillage Global
*   **Système de Crédits** : Chaque action (Builder, Chat, Chief of Staff, Telegram) consomme des crédits selon le Tier d'IA utilisé.
*   **Verrouillage Global** : Dès que le solde atteint 0, toutes les fonctionnalités sont bloquées avec le message : *"Plus de crédits ! Ne laissez pas les crédits briser votre imagination. Recharger des crédits : https://jarvisagent.app/billing"*.
*   **Alerte Déplétion** : Envoi automatique d'une notification (Email/Log) dès l'épuisement du solde.
*   **Plans Disponibles** :
    *   **Starter (9.99$/mois)** : 1 000 Crédits. Plugins Google + GitHub. 5 déploiements mensuels.
    *   **Pro (24.99$/mois)** : 2 500 Crédits. Chat illimité, toutes les intégrations, tâches en arrière-plan.
    *   **Ultra (49.99$/mois)** : 5 000 Crédits. Accès au mode Ultra-Intelligent (Deep Research).

## 6. Variables d'Environnement Requises (`.env`)
Pour que toute l'architecture de Jarvis OS fonctionne, vous devez configurer le fichier `.env` du backend :

```env
# -----------------------------
# CORE & SÉCURITÉ
# -----------------------------
JWT_SECRET="votre_secret_jwt"
APP_PUBLIC_URL="https://jarvisagent.app"
APP_BASE_URL="http://localhost:3000"

# -----------------------------
# SUPABASE (Base de données et Auth)
# -----------------------------
SUPABASE_URL="https://votre-id.supabase.co"
SUPABASE_SERVICE_KEY="votre_service_role_key"

# -----------------------------
# STRIPE (Facturation et Crédits)
# -----------------------------
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_STARTER="price_abc123"
STRIPE_PRICE_PRO="price_def456"
STRIPE_PRICE_ULTRA="price_ghi789"

# -----------------------------
# INTÉGRATIONS & PLUGINS
# -----------------------------
GITHUB_TOKEN="ghp_..."
GOOGLE_CLIENT_ID="votre_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="votre_client_secret"
TELEGRAM_BOT_TOKEN="12345:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
TELEGRAM_BOT_USERNAME="JarvisAgentBot"

# -----------------------------
# CLÉS D'API IA (Model Router - Optimized for Free Tiers)
# -----------------------------
# Jarvis utilise une cascade intelligente pour maximiser l'usage des Tiers Gratuits
ANTHROPIC_API_KEY="sk-ant-..."   # Claude 3 Opus, Sonnet, Haiku
OPENAI_API_KEY="sk-proj-..."     # GPT-4o, GPT-4o-mini
GEMINI_API_KEY="AIzaSy..."       # Gemini 1.5 Flash, Pro, 2.0 (Principal)
MISTRAL_API_KEY="votre_cle"      # Codestral
CEREBRAS_API_KEY="votre_cle"     # Llama 3.3 70B (Tier SLM ultra-rapide)
GROQ_API_KEY="gsk_..."           # Fallback Llama/Phi
OPENROUTER_API_KEY="sk-or-..."   # Hub central pour modèles exotiques
TOGETHER_API_KEY="..."           # Fallback supplémentaire
COHERE_API_KEY="..."             # Modèles Command R
HYPERBOLIC_API_KEY="..."         # Accès GPU haute performance
SAMBANOVA_API_KEY="..."          # Inférence Llama ultra-rapide
```
