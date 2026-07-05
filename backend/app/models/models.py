from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    topics = Column(ARRAY(String), default=[])
    schedule_time = Column(String, default="07:00")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    digests = relationship("Digest", back_populates="user")
    chat_history = relationship("ChatHistory", back_populates="user")


class Digest(Base):
    __tablename__ = "digests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_briefing = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="digests")
    articles = relationship("Article", back_populates="digest")


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    digest_id = Column(Integer, ForeignKey("digests.id"), nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    source = Column(String)
    url = Column(String)
    topic = Column(String)
    sentiment = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    digest = relationship("Digest", back_populates="articles")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_history")