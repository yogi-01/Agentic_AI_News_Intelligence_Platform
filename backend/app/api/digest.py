from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, Digest
from app.schemas.schemas import DigestResponse
from typing import List

router = APIRouter()


@router.post("/trigger/{user_id}")
def trigger_digest(user_id: int, db: Session = Depends(get_db)):
    """Manually trigger the agent for a specific user."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.topics:
        raise HTTPException(status_code=400, detail="User has no topics set")

    # Kick off Celery task asynchronously
    from app.services.celery_app import run_digest_for_user
    task = run_digest_for_user.delay(user_id)

    return {
        "message": "Digest generation started",
        "task_id": task.id,
        "user_id": user_id
    }


@router.get("/latest/{user_id}", response_model=DigestResponse)
def get_latest_digest(user_id: int, db: Session = Depends(get_db)):
    """Get the most recent digest for a user."""

    digest = (
        db.query(Digest)
        .filter(Digest.user_id == user_id)
        .order_by(Digest.created_at.desc())
        .first()
    )

    if not digest:
        raise HTTPException(status_code=404, detail="No digest found for this user")

    return digest


@router.get("/history/{user_id}", response_model=List[DigestResponse])
def get_digest_history(user_id: int, db: Session = Depends(get_db)):
    """Get all past digests for a user."""

    digests = (
        db.query(Digest)
        .filter(Digest.user_id == user_id)
        .order_by(Digest.created_at.desc())
        .limit(10)
        .all()
    )

    return digests