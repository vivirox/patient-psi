"""Rate limiter implementation for handling API rate limits."""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging
from pydantic import BaseModel
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)

logger = logging.getLogger(__name__)

class RateLimitConfig(BaseModel):
    """Configuration for rate limiting."""
    requests_per_minute: int = 20
    max_retries: int = 3
    min_wait_seconds: int = 60
    max_wait_seconds: int = 3600  # 1 hour
    base_wait_seconds: int = 60

class TokenBucket:
    """Token bucket implementation for rate limiting."""
    
    def __init__(self, rate: int, capacity: int):
        self.rate = rate  # tokens per second
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.time()
        self._lock = asyncio.Lock()
        
    async def acquire(self) -> bool:
        """
        Attempt to acquire a token.
        
        Returns:
            bool: True if token acquired, False if would exceed rate limit
        """
        async with self._lock:
            now = time.time()
            # Add new tokens based on time passed
            time_passed = now - self.last_update
            new_tokens = time_passed * self.rate
            self.tokens = min(self.capacity, self.tokens + new_tokens)
            self.last_update = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False
            
    async def wait_for_token(self) -> None:
        """Wait until a token is available."""
        while not await self.acquire():
            await asyncio.sleep(1 / self.rate)

class RateLimiter:
    """Rate limiter for API calls."""
    
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.buckets: Dict[str, TokenBucket] = {}
        self.last_error_time: Dict[str, datetime] = {}
        
    def _get_bucket(self, model: str) -> TokenBucket:
        """Get or create token bucket for model."""
        if model not in self.buckets:
            self.buckets[model] = TokenBucket(
                rate=self.config.requests_per_minute / 60,
                capacity=self.config.requests_per_minute
            )
        return self.buckets[model]
        
    async def acquire_token(self, model: str) -> None:
        """
        Acquire token for model, waiting if necessary.
        
        Args:
            model: Model identifier
        """
        bucket = self._get_bucket(model)
        await bucket.wait_for_token()
        
    def record_error(self, model: str) -> None:
        """Record rate limit error for model."""
        self.last_error_time[model] = datetime.now()
        
    def get_wait_time(self, model: str) -> int:
        """
        Get wait time based on last error.
        
        Args:
            model: Model identifier
            
        Returns:
            Wait time in seconds
        """
        last_error = self.last_error_time.get(model)
        if not last_error:
            return self.config.min_wait_seconds
            
        time_since_error = (datetime.now() - last_error).total_seconds()
        if time_since_error < self.config.min_wait_seconds:
            return self.config.min_wait_seconds
            
        return min(
            self.config.max_wait_seconds,
            int(self.config.base_wait_seconds * (time_since_error / 60))
        )

def create_rate_limit_retry(
    rate_limiter: RateLimiter,
    model: str
) -> retry:
    """
    Create retry decorator for rate limited operations.
    
    Args:
        rate_limiter: Rate limiter instance
        model: Model identifier
        
    Returns:
        Retry decorator
    """
    def is_rate_limit_error(exception):
        return (
            isinstance(exception, Exception) and
            "rate limit exceeded" in str(exception).lower()
        )
    
    return retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(rate_limiter.config.max_retries),
        wait=wait_exponential(
            multiplier=rate_limiter.config.min_wait_seconds,
            max=rate_limiter.config.max_wait_seconds
        ),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        after=lambda retry_state: rate_limiter.record_error(model)
        if retry_state.outcome.failed else None
    )

async def with_rate_limit(
    rate_limiter: RateLimiter,
    model: str,
    func,
    *args,
    **kwargs
):
    """
    Execute function with rate limiting.
    
    Args:
        rate_limiter: Rate limiter instance
        model: Model identifier
        func: Function to execute
        *args: Positional arguments for func
        **kwargs: Keyword arguments for func
        
    Returns:
        Function result
    """
    await rate_limiter.acquire_token(model)
    
    @create_rate_limit_retry(rate_limiter, model)
    async def execute():
        return await func(*args, **kwargs)
    
    return await execute()
