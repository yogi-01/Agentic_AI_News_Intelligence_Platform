import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialize ChromaDB client
# Initialize persistent ChromaDB client
chroma_client = chromadb.PersistentClient(path="/app/chroma_db")
collection = chroma_client.get_or_create_collection(
    name="news_articles",
    metadata={"hnsw:space": "cosine"}
)

# Initialize embeddings model
embeddings_model = HuggingFaceEmbeddings(
    model_name=settings.HUGGINGFACE_MODEL
)

# Initialize LLM
llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model_name="llama-3.1-8b-instant")


def store_articles_in_chroma(digest_id: int, articles: list):
    """Store article summaries as vector embeddings in ChromaDB."""
    
    documents = []
    embeddings = []
    ids = []
    metadatas = []

    for i, article in enumerate(articles):
        doc_text = f"Title: {article['title']}\nSummary: {article['summary']}\nSource: {article['source']}\nTopic: {article['topic']}"
        
        embedding = embeddings_model.embed_query(doc_text)
        
        documents.append(doc_text)
        embeddings.append(embedding)
        ids.append(f"digest_{digest_id}_article_{i}")
        metadatas.append({
            "digest_id": str(digest_id),
            "topic": article["topic"],
            "url": article["url"],
            "title": article["title"]
        })

    if documents:
        collection.add(
            documents=documents,
            embeddings=embeddings,
            ids=ids,
            metadatas=metadatas
        )
        logger.info(f"Stored {len(documents)} articles in ChromaDB")


def chat_with_digest(user_message: str, digest_id: int) -> str:
    """Answer user questions about the digest using RAG."""

    # Embed the user question
    query_embedding = embeddings_model.embed_query(user_message)

    # Retrieve top 3 most relevant articles
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=3,
        where={"digest_id": str(digest_id)}
    )

    # Build context from retrieved articles
    context = ""
    if results["documents"] and results["documents"][0]:
        for doc in results["documents"][0]:
            context += f"\n---\n{doc}"
    else:
        context = "No relevant articles found in today's digest."

    # Generate answer using Groq/LLaMA
    prompt = ChatPromptTemplate.from_template("""
    You are a helpful news assistant. Answer the user's question based on 
    the news articles from today's digest provided below.
    
    If the answer is not in the articles, say so honestly.
    Keep your answer concise and informative.

    Today's relevant articles:
    {context}

    User question: {question}

    Answer:
    """)

    chain = prompt | llm

    try:
        result = chain.invoke({
            "context": context,
            "question": user_message
        })
        return result.content
    except Exception as e:
        logger.error(f"RAG chat error: {e}")
        return "Sorry, I couldn't process your question. Please try again."