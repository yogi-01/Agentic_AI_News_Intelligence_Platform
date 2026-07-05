from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine
from app.models.models import Base
from app.api import users, digest, chat
from app.api.websocket import router as websocket_router

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI News Digest & Briefing Agent",
    description="An agentic AI system that delivers personalized news briefings",
    version="1.0.0"
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(digest.router, prefix="/api/digest", tags=["digest"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

# WebSocket route
app.include_router(websocket_router, tags=["websocket"])

@app.get("/")
def health_check():
    return {"status": "ok", "message": "AI News Digest Agent is running"}