from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, Digest, ChatHistory
from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.rag_service import chat_with_digest
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Chat about today's digest using RAG."""

    # Verify user exists
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get latest digest
    digest = (
        db.query(Digest)
        .filter(Digest.user_id == request.user_id)
        .order_by(Digest.created_at.desc())
        .first()
    )

    if not digest:
        raise HTTPException(
            status_code=404,
            detail="No digest found. Please generate a digest first."
        )

    # Get RAG response
    response_text = chat_with_digest(
        user_message=request.message,
        digest_id=digest.id
    )

    # Save to chat history
    chat_record = ChatHistory(
        user_id=request.user_id,
        message=request.message,
        response=response_text
    )
    db.add(chat_record)
    db.commit()

    return ChatResponse(
        message=request.message,
        response=response_text,
        created_at=datetime.now()
    )


@router.get("/history/{user_id}")
def get_chat_history(user_id: int, db: Session = Depends(get_db)):
    """Get chat history for a user."""

    history = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == user_id)
        .order_by(ChatHistory.created_at.desc())
        .limit(50)
        .all()
    )

    return history  