from app.api import digest
from app.agents.state import AgentState
from app.core.config import settings
from newsapi import NewsApiClient
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
import logging

logger = logging.getLogger(__name__)

# Initialize LLM once — reused across nodes
llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model_name="llama-3.1-8b-instant"
)

# ─────────────────────────────────────────
# NODE 1: FETCH
# Calls News API for each topic and collects raw articles
# ─────────────────────────────────────────
def fetch_node(state: AgentState) -> AgentState:
    logger.info(f"Fetching news for topics: {state['topics']}")
    
    newsapi = NewsApiClient(api_key=settings.NEWS_API_KEY)
    raw_articles = []

    for topic in state["topics"]:
        try:
            response = newsapi.get_everything(
                q=topic,
                language="en",
                sort_by="publishedAt",
                page_size=10
            )
            for article in response.get("articles", []):
                if article.get("title") and article.get("description"):
                    raw_articles.append({
                        "title": article["title"],
                        "description": article["description"],
                        "url": article["url"],
                        "source": article["source"]["name"],
                        "topic": topic,
                        "published_at": article["publishedAt"]
                    })
        except Exception as e:
            logger.error(f"Error fetching topic {topic}: {e}")

    logger.info(f"Fetched {len(raw_articles)} total articles")
    return {**state, "raw_articles": raw_articles}


# ─────────────────────────────────────────
# NODE 2: FILTER
# Removes duplicates and low quality articles
# ─────────────────────────────────────────
def filter_node(state: AgentState) -> AgentState:
    logger.info("Filtering articles")
    
    articles = state["raw_articles"]
    seen_titles = set()
    filtered = []

    for article in articles:
        title = article["title"].lower().strip()
        
        # Skip duplicates
        if title in seen_titles:
            continue
        
        # Skip low quality
        if len(article["description"]) < 50:
            continue
        
        # Skip removed articles
        if "[removed]" in article["title"].lower():
            continue

        seen_titles.add(title)
        filtered.append(article)

    # Keep top 5 per topic
    topic_counts = {}
    final_filtered = []
    for article in filtered:
        topic = article["topic"]
        topic_counts[topic] = topic_counts.get(topic, 0)
        if topic_counts[topic] < 5:
            final_filtered.append(article)
            topic_counts[topic] += 1

    logger.info(f"Filtered down to {len(final_filtered)} articles")
    return {**state, "filtered_articles": final_filtered}


# ─────────────────────────────────────────
# NODE 3: SUMMARIZE
# Uses Groq/LLaMA to summarize each article
# ─────────────────────────────────────────
def summarize_node(state: AgentState) -> AgentState:
    logger.info("Summarizing articles")

    prompt = ChatPromptTemplate.from_template("""
    You are a news summarizer. Given the article title and description below,
    write a clear 2-3 sentence summary and determine the sentiment.
    
    Title: {title}
    Description: {description}
    
    Respond in this exact format:
    SUMMARY: <your 2-3 sentence summary>
    SENTIMENT: <positive, negative, or neutral>
    """)

    chain = prompt | llm
    processed_articles = []

    for article in state["filtered_articles"]:
        try:
            result = chain.invoke({
                "title": article["title"],
                "description": article["description"]
            })
            
            content = result.content
            summary = ""
            sentiment = "neutral"

            for line in content.split("\n"):
                if line.startswith("SUMMARY:"):
                    summary = line.replace("SUMMARY:", "").strip()
                elif line.startswith("SENTIMENT:"):
                    sentiment = line.replace("SENTIMENT:", "").strip().lower()

            processed_articles.append({
                "title": article["title"],
                "summary": summary or article["description"][:200],
                "url": article["url"],
                "source": article["source"],
                "topic": article["topic"],
                "sentiment": sentiment
            })

        except Exception as e:
            logger.error(f"Error summarizing article: {e}")
            processed_articles.append({
                "title": article["title"],
                "summary": article["description"][:200],
                "url": article["url"],
                "source": article["source"],
                "topic": article["topic"],
                "sentiment": "neutral"
            })

    logger.info(f"Summarized {len(processed_articles)} articles")
    return {**state, "processed_articles": processed_articles}


# ─────────────────────────────────────────
# NODE 4: BRIEFING
# Composes the full personalized digest
# ─────────────────────────────────────────
def briefing_node(state: AgentState) -> AgentState:
    logger.info("Composing briefing")

    articles = state["processed_articles"]
    topics = state["topics"]

    prompt = ChatPromptTemplate.from_template("""
    You are a professional news briefing writer.
    Write a personalized morning briefing based on the articles below.
    Group by topic, write an engaging intro, and end with a closing note.
    Keep it concise and informative.

    Topics covered: {topics}

    Articles:
    {articles}

    Write the full briefing now:
    """)

    articles_text = ""
    for article in articles:
        articles_text += f"""
        Topic: {article['topic']}
        Title: {article['title']}
        Summary: {article['summary']}
        Source: {article['source']}
        ---
        """

    chain = prompt | llm

    try:
        result = chain.invoke({
            "topics": ", ".join(topics),
            "articles": articles_text
        })
        full_briefing = result.content
    except Exception as e:
        logger.error(f"Error composing briefing: {e}")
        full_briefing = "Your daily briefing is ready. Please check individual articles below."

    logger.info("Briefing composed successfully")
    return {**state, "full_briefing": full_briefing}


# ─────────────────────────────────────────
# NODE 5: DELIVERY
# Saves to DB and sends email
# ─────────────────────────────────────────
def delivery_node(state: AgentState) -> AgentState:
    logger.info("Delivering briefing")

    from app.core.database import SessionLocal
    from app.models.models import Digest, Article as ArticleModel

    db = SessionLocal()

    try:
        # Save digest to PostgreSQL
        digest = Digest(
            user_id=state["user_id"],
            full_briefing=state["full_briefing"]
        )
        db.add(digest)
        db.flush()

        # Save each article
        for article in state["processed_articles"]:
            db_article = ArticleModel(
                digest_id=digest.id,
                title=article["title"],
                summary=article["summary"],
                source=article["source"],
                url=article["url"],
                topic=article["topic"],
                sentiment=article["sentiment"]
            )
            db.add(db_article)

        db.commit()
        db.refresh(digest)
        digest_id = digest.id
        logger.info(f"Saved digest {digest_id} to database")
        # Store articles in ChromaDB for RAG chat
        try:
            from app.services.rag_service import store_articles_in_chroma
            store_articles_in_chroma(digest.id, state["processed_articles"])
            logger.info("Articles stored in ChromaDB")
        except Exception as e:
            logger.error(f"ChromaDB error: {e}")

    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        digest_id = None
    finally:
        db.close()

    # Send email via SendGrid
    try:
        from app.services.email_service import send_digest_email
        send_digest_email(
            to_email=state["user_email"],
            briefing=state["full_briefing"],
            articles=state["processed_articles"]
        )
        logger.info("Email sent successfully")
    except Exception as e:
        logger.error(f"Email error: {e}")

    return {**state, "digest_id": digest_id} 