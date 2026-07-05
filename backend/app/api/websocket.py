from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.agents.graph import agent
from app.core.database import SessionLocal
from app.models.models import User
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)

# Track active connections
active_connections: dict = {}


@router.websocket("/ws/digest/{user_id}")
async def digest_websocket(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for live agent progress updates."""

    await websocket.accept()
    active_connections[user_id] = websocket
    logger.info(f"WebSocket connected for user {user_id}")

    try:
        while True:
            # Wait for trigger message from frontend
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("action") == "start_digest":
                await run_agent_with_updates(websocket, user_id)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
        active_connections.pop(user_id, None)


async def run_agent_with_updates(websocket: WebSocket, user_id: int):
    """Run the agent and send progress updates via WebSocket."""

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.send_json({
                "status": "error",
                "message": "User not found"
            })
            return

        if not user.topics:
            await websocket.send_json({
                "status": "error",
                "message": "No topics set. Please update your settings."
            })
            return

        # Send progress updates as each stage runs
        await websocket.send_json({
            "status": "progress",
            "step": "fetch",
            "message": f"Fetching latest news for: {', '.join(user.topics)}..."
        })

        initial_state = {
            "user_id": user.id,
            "user_email": user.email,
            "topics": user.topics,
            "raw_articles": [],
            "filtered_articles": [],
            "processed_articles": [],
            "full_briefing": "",
            "digest_id": None,
            "error": None
        }

        # Run agent synchronously and send updates
        # In production you'd stream node by node
        await websocket.send_json({
            "status": "progress",
            "step": "filter",
            "message": "Filtering and ranking articles..."
        })

        await websocket.send_json({
            "status": "progress",
            "step": "summarize",
            "message": "Summarizing articles with AI..."
        })

        await websocket.send_json({
            "status": "progress",
            "step": "briefing",
            "message": "Composing your personalized briefing..."
        })

        # Run the full agent
        result = agent.invoke(initial_state)

        await websocket.send_json({
            "status": "progress",
            "step": "delivery",
            "message": "Saving digest and sending email..."
        })

        await websocket.send_json({
            "status": "complete",
            "message": "Your digest is ready!",
            "digest_id": result.get("digest_id")
        })

    except Exception as e:
        logger.error(f"Agent error: {e}")
        await websocket.send_json({
            "status": "error",
            "message": f"Something went wrong: {str(e)}"
        })
    finally:
        db.close() 