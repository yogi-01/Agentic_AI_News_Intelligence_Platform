\# Agentic AI News Intelligence Platform



A full-stack agentic AI application that autonomously ingests news articles, filters relevance, generates personalized summaries, and delivers scheduled email briefings. Built with a LangGraph-orchestrated multi-node pipeline, FastAPI backend, Celery + Redis for distributed task scheduling, and a React/TypeScript frontend with real-time WebSocket updates.



\## Features



\- \*\*Agentic Pipeline\*\* — LangGraph 5-node pipeline orchestrates the full workflow: fetch → filter → summarize → personalize → deliver. Each node runs autonomously with state passed between nodes.

\- \*\*LLM Inference\*\* — Groq/LLaMA 3.1 8B used for article summarization and personalized briefing generation via prompt-engineered chains.

\- \*\*RAG-Powered Chat\*\* — Follow-up questions answered using ChromaDB vector storage and HuggingFace all-MiniLM-L6-v2 embeddings for semantic retrieval over ingested articles.

\- \*\*Distributed Task Scheduling\*\* — Celery + Redis handles background task execution and beat scheduling for automated periodic briefing delivery.

\- \*\*Email Delivery\*\* — SendGrid delivers personalized briefings to users on a configurable schedule.

\- \*\*Real-Time WebSocket Updates\*\* — Live agent node progress streamed to the React frontend as the pipeline executes.

\- \*\*React/TypeScript Frontend\*\* — Dashboard showing pipeline status, briefing history, and RAG-powered follow-up chat interface.

\- \*\*Containerized Deployment\*\* — Full Docker Compose setup with backend, frontend (nginx), Redis, and PostgreSQL services.

\- \*\*CI/CD\*\* — GitHub Actions pipeline running automated tests on every push.



\## Tech Stack



| Layer | Technology |

|---|---|

| Agentic orchestration | LangGraph |

| LLM inference | Groq API (LLaMA 3.1 8B) |

| RAG | ChromaDB + HuggingFace all-MiniLM-L6-v2 |

| Backend framework | FastAPI |

| Task queue | Celery + Redis |

| Email delivery | SendGrid |

| Database | PostgreSQL + Alembic migrations |

| Frontend | React, TypeScript, Vite, Tailwind CSS |

| Real-time | WebSockets |

| Containerization | Docker, Docker Compose, nginx |

| CI/CD | GitHub Actions |



\## Architecture

React Frontend (Vite + Tailwind, port 5173)

↓ HTTP / WebSocket

FastAPI Backend (port 8000)

↓

LangGraph Pipeline (5-node agentic workflow)

Node 1: Fetch news articles

Node 2: Filter by relevance

Node 3: Summarize with LLaMA

Node 4: Personalize briefing

Node 5: Deliver via SendGrid

↓

Celery Workers ← Redis (broker + result backend)

ChromaDB       ← HuggingFace embeddings (RAG)

PostgreSQL     ← transactional data + user preferences



\## Pipeline Flow



1\. Celery beat triggers the briefing pipeline on a configured schedule

2\. LangGraph orchestrates the 5-node workflow, passing state between nodes

3\. Articles are fetched, filtered for relevance, and summarized using LLaMA

4\. A personalized briefing is generated and delivered via SendGrid

5\. WebSocket events stream live node progress to the frontend dashboard

6\. Users can ask follow-up questions answered via RAG over the ingested articles



\## Getting Started



\### Prerequisites

\- Python 3.11+, \[uv](https://docs.astral.sh/uv/) or pip

\- Node.js + npm

\- Docker Desktop

\- Groq API key (free at \[console.groq.com](https://console.groq.com))

\- SendGrid API key



\### Backend Setup



1\. Navigate to the backend directory:

```bash

&#x20;  cd backend

&#x20;  pip install -r requirements.txt

```



2\. Create a `.env` file in the project root:

DATABASE\_URL=postgresql://user:password@localhost:5432/news\_agent

REDIS\_URL=redis://localhost:6379/0

GROQ\_API\_KEY=<your key>

SENDGRID\_API\_KEY=<your key>

SECRET\_KEY=<your django/fastapi secret key>



3\. Start all services with Docker Compose:

```bash

&#x20;  docker compose up -d

```



4\. Run migrations:

```bash

&#x20;  alembic upgrade head

```



5\. Start the FastAPI server:

```bash

&#x20;  uvicorn app.main:app --reload

```



6\. Start Celery worker and beat scheduler (separate terminals):

```bash

&#x20;  celery -A app.celery\_app worker --loglevel=info

&#x20;  celery -A app.celery\_app beat --loglevel=info

```



\### Frontend Setup



```bash

cd frontend

npm install

npm run dev

```



Open `http://localhost:5173` — the dashboard shows real-time pipeline execution and the RAG chat interface.



\### Running Tests



```bash

cd backend

pytest -v

```



\## API Overview



| Method | Endpoint | Description |

|---|---|---|

| POST | `/auth/register/` | Register a new user |

| POST | `/auth/login/` | Authenticate, receive JWT tokens |

| GET | `/briefings/` | List user briefings |

| POST | `/briefings/trigger/` | Manually trigger pipeline |

| WebSocket | `/ws/pipeline/` | Stream live pipeline node events |

| POST | `/chat/` | RAG-powered follow-up question answering |



\## Design Notes



\- \*\*LangGraph state machine\*\* — each node receives and returns a shared state object, making the pipeline inspectable, resumable, and testable node by node.

\- \*\*ChromaDB PersistentClient\*\* — vector store persists embeddings to disk so article context survives service restarts without re-embedding.

\- \*\*Celery beat scheduling\*\* — briefing frequency is configurable via the celerybeat-schedule file without code changes.

\- \*\*nginx reverse proxy\*\* — frontend Dockerfile uses nginx to serve the built React app and proxy API requests to the FastAPI backend in production.

