"""Test script to verify all required dependencies are installed and working."""

def test_dependencies():
    """Test that all required dependencies can be imported."""
    try:
        import langchain_ollama
        print("✓ langchain_ollama")
        
        import aioredis
        print("✓ aioredis")
        
        import psutil
        print("✓ psutil")
        
        import pydantic
        print("✓ pydantic")
        
        import structlog
        print("✓ structlog")
        
        import dotenv
        print("✓ python-dotenv")
        
        import tenacity
        print("✓ tenacity")
        
        import sqlalchemy
        print("✓ sqlalchemy")
        
        import tiktoken
        print("✓ tiktoken")
        
        print("\nAll dependencies successfully installed! 🎉")
        
    except ImportError as e:
        print(f"\n❌ Error: {str(e)}")
        print("Please install missing dependencies with: pip install -r requirements.txt")

if __name__ == "__main__":
    test_dependencies()
