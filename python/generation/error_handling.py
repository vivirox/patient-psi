import os
import logging
import asyncio
from typing import TypeVar, Callable, Awaitable, Optional, Any
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')

class RetryConfig:
    """Configuration for retry behavior."""
    def __init__(
        self,
        max_attempts: int = int(os.getenv('MAX_ATTEMPTS', '3')),
        base_delay: float = float(os.getenv('RETRY_BASE_DELAY', '2')),
        max_delay: float = float(os.getenv('MAX_RETRY_DELAY', '60')),
        timeout: float = float(os.getenv('TIMEOUT_SECONDS', '300'))
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.timeout = timeout

class GenerationError(Exception):
    """Base exception for generation errors."""
    pass

class ModelNotAvailableError(GenerationError):
    """Raised when the LLM model is not available."""
    pass

class InvalidResponseError(GenerationError):
    """Raised when the LLM response cannot be parsed."""
    pass

class RateLimitError(GenerationError):
    """Raised when hitting rate limits."""
    pass

class TimeoutError(GenerationError):
    """Raised when operation times out."""
    pass

def with_retries(
    retry_config: Optional[RetryConfig] = None,
    excluded_exceptions: tuple = ()
):
    """
    Decorator for retrying async functions with exponential backoff.
    
    Args:
        retry_config: Configuration for retry behavior
        excluded_exceptions: Exceptions that should not trigger retries
        
    Returns:
        Decorated function
    """
    if retry_config is None:
        retry_config = RetryConfig()

    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception: Optional[Exception] = None
            
            for attempt in range(retry_config.max_attempts):
                try:
                    # Create task with timeout
                    async with asyncio.timeout(retry_config.timeout):
                        return await func(*args, **kwargs)
                        
                except asyncio.TimeoutError:
                    logger.error(f"Operation timed out after {retry_config.timeout}s")
                    raise TimeoutError(f"Operation timed out after {retry_config.timeout}s")
                    
                except excluded_exceptions as e:
                    # Don't retry excluded exceptions
                    raise
                    
                except Exception as e:
                    last_exception = e
                    
                    if attempt + 1 < retry_config.max_attempts:
                        delay = min(
                            retry_config.base_delay * (2 ** attempt),
                            retry_config.max_delay
                        )
                        
                        logger.warning(
                            f"Attempt {attempt + 1}/{retry_config.max_attempts} "
                            f"failed: {str(e)}. Retrying in {delay}s"
                        )
                        
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"All {retry_config.max_attempts} attempts failed. "
                            f"Last error: {str(e)}"
                        )
                        raise GenerationError(
                            f"Failed after {retry_config.max_attempts} attempts: {str(e)}"
                        ) from last_exception
            
            # This should never be reached due to the raise in the loop
            assert False, "Unreachable code"
            
        return wrapper
    return decorator

async def validate_model_availability(llm: Any) -> None:
    """
    Validate that the LLM model is available and responding.
    
    Args:
        llm: The language model instance
        
    Raises:
        ModelNotAvailableError: If the model is not available
    """
    try:
        # Simple test generation to verify model access
        test_msg = "Test"
        await llm.ainvoke([{"role": "user", "content": test_msg}])
    except Exception as e:
        logger.error(f"Model validation failed: {str(e)}")
        raise ModelNotAvailableError(f"Model is not available: {str(e)}")

def setup_error_handlers() -> None:
    """Set up global error handlers and logging."""
    def handle_exception(exc_type, exc_value, exc_traceback):
        if issubclass(exc_type, KeyboardInterrupt):
            # Don't log keyboard interrupt
            return
            
        logger.error(
            "Uncaught exception",
            exc_info=(exc_type, exc_value, exc_traceback)
        )
    
    # Set up global exception handler
    import sys
    sys.excepthook = handle_exception
