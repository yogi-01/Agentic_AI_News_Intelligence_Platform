from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # API Keys
    GROQ_API_KEY: str
    NEWS_API_KEY: str
    SENDGRID_API_KEY: str
    SENDGRID_FROM_EMAIL: str

    # HuggingFace
    HUGGINGFACE_MODEL: str = "all-MiniLM-L6-v2"

    # App
    SECRET_KEY: str = "supersecretkey"
    DEBUG: bool = True

    class Config:
        env_file = ".env"

settings = Settings()