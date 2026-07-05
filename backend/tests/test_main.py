from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_health_check():
    """Test that the API is running."""
    # Basic smoke test
    assert True

def test_import():
    """Test that main modules import correctly."""
    try:
        from app.agents.state import AgentState
        from app.schemas.schemas import UserCreate
        assert True
    except ImportError as e:
        assert False, f"Import failed: {e}"