from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    topics: List[str] = []
    schedule_time: str = "07:00"

class UserUpdate(BaseModel):
    topics: Optional[List[str]] = None
    schedule_time: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    topics: List[str]
    schedule_time: str
    created_at: datetime

    class Config:
        from_attributes = True

# Article schemas
class ArticleResponse(BaseModel):
    id: int
    title: str
    summary: str
    source: Optional[str]
    url: Optional[str]
    topic: str
    sentiment: Optional[str]

    class Config:
        from_attributes = True

# Digest schemas
class DigestResponse(BaseModel):
    id: int
    full_briefing: str
    created_at: datetime
    articles: List[ArticleResponse]

    class Config:
        from_attributes = True

# Chat schemas
class ChatRequest(BaseModel):
    user_id: int
    message: str

class ChatResponse(BaseModel):
    message: str
    response: str
    created_at: datetime

    class Config:
        from_attributes = True