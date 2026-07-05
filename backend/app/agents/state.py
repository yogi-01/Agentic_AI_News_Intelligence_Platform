from typing import TypedDict, List, Optional
from datetime import datetime

class Article(TypedDict):
    title: str
    description: str
    url: str
    source: str
    topic: str
    published_at: str

class ProcessedArticle(TypedDict):
    title: str
    summary: str
    url: str
    source: str
    topic: str
    sentiment: str

class AgentState(TypedDict):
    # Input
    user_id: int
    user_email: str
    topics: List[str]

    # Intermediate
    raw_articles: List[Article]
    filtered_articles: List[Article]
    processed_articles: List[ProcessedArticle]

    # Output
    full_briefing: str
    digest_id: Optional[int]
    error: Optional[str]