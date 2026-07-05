import sendgrid
from sendgrid.helpers.mail import Mail
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_digest_email(to_email: str, briefing: str, articles: list):
    """Send the daily news digest email via SendGrid."""
    
    # Build HTML email body
    articles_html = ""
    current_topic = ""
    
    for article in articles:
        if article["topic"] != current_topic:
            current_topic = article["topic"]
            articles_html += f"""
            <h3 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; 
                padding-bottom: 8px; margin-top: 24px;">
                {current_topic.upper()}
            </h3>
            """
        
        sentiment_color = {
            "positive": "#16a34a",
            "negative": "#dc2626",
            "neutral": "#6b7280"
        }.get(article["sentiment"], "#6b7280")

        articles_html += f"""
        <div style="margin-bottom: 16px; padding: 12px; 
             background: #f9fafb; border-radius: 8px;">
            <a href="{article['url']}" style="font-weight: bold; 
               color: #111827; text-decoration: none;">
                {article['title']}
            </a>
            <p style="color: #374151; margin: 8px 0;">
                {article['summary']}
            </p>
            <span style="color: {sentiment_color}; font-size: 12px;">
                ● {article['sentiment'].capitalize()}
            </span>
            <span style="color: #9ca3af; font-size: 12px; margin-left: 12px;">
                {article['source']}
            </span>
        </div>
        """

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 680px; 
         margin: 0 auto; padding: 24px;">
        
        <h1 style="color: #111827; font-size: 24px;">
            Your Daily News Briefing
        </h1>
        
        <div style="background: #eff6ff; border-left: 4px solid #2563eb; 
             padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="color: #1e40af; margin: 0; white-space: pre-line;">
                {briefing}
            </p>
        </div>

        <h2 style="color: #111827;">Today's Stories</h2>
        {articles_html}

        <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            AI News Digest Agent — Powered by LangGraph & Groq
        </p>
    </div>
    """

    message = Mail(
        from_email=settings.SENDGRID_FROM_EMAIL,
        to_emails=to_email,
        subject="Your Daily AI News Briefing",
        html_content=html_content
    )

    try:
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Email sent to {to_email}, status: {response.status_code}")
        return True
    except Exception as e:
        logger.error(f"SendGrid error: {e}")
        return False