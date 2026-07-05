from celery import Celery
from celery.schedules import crontab
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create Celery app with Redis as broker
celery_app = Celery(
    "news_agent",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/New_York",
    enable_utc=True,
    # Schedule: run every day at 7am
    beat_schedule={
        "daily-news-digest": {
            "task": "app.services.celery_app.run_digest_for_all_users",
            "schedule": crontab(hour=7, minute=0),
        }
    }
)


@celery_app.task
def run_digest_for_all_users():
    """Scheduled task — runs LangGraph agent for every user."""
    logger.info("Starting scheduled digest run for all users")

    from app.core.database import SessionLocal
    from app.models.models import User
    from app.agents.graph import agent

    db = SessionLocal()
    try:
        users = db.query(User).all()
        logger.info(f"Found {len(users)} users to process")

        for user in users:
            if not user.topics:
                logger.info(f"Skipping user {user.id} — no topics set")
                continue

            try:
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
                agent.invoke(initial_state)
                logger.info(f"Digest completed for user {user.id}")

            except Exception as e:
                logger.error(f"Agent error for user {user.id}: {e}")

    finally:
        db.close()


@celery_app.task
def run_digest_for_user(user_id: int):
    """Manual trigger — runs agent for a single user."""
    logger.info(f"Running manual digest for user {user_id}")

    from app.core.database import SessionLocal
    from app.models.models import User
    from app.agents.graph import agent

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found")
            return

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
        result = agent.invoke(initial_state)
        logger.info(f"Manual digest completed for user {user_id}")
        return result

    finally:
        db.close()