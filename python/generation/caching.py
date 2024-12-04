import json
import hashlib
import aiofiles
import os
from pathlib import Path
from typing import Optional, TypeVar, Generic
from datetime import datetime, timedelta
from pydantic import BaseModel

T = TypeVar('T')

class CacheEntry(BaseModel, Generic[T]):
    data: T
    created_at: datetime
    expires_at: datetime

class CacheService:
    def __init__(self, cache_dir: str = ".cache", ttl_hours: int = 24):
        self.cache_dir = Path(cache_dir)
        self.ttl_hours = ttl_hours
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_key(self, data: str) -> str:
        """Generate a cache key from input data using SHA-256."""
        return hashlib.sha256(data.encode()).hexdigest()

    def _get_cache_path(self, cache_key: str) -> Path:
        """Get the full path for a cache file."""
        return self.cache_dir / f"{cache_key}.json"

    async def get(self, key: str, model_cls: type[T]) -> Optional[T]:
        """
        Retrieve data from cache if it exists and is not expired.
        
        Args:
            key: The cache key
            model_cls: The Pydantic model class for type validation
            
        Returns:
            The cached data if found and valid, None otherwise
        """
        cache_key = self._get_cache_key(key)
        cache_path = self._get_cache_path(cache_key)
        
        if not cache_path.exists():
            return None
            
        try:
            async with aiofiles.open(cache_path, 'r') as f:
                content = await f.read()
                entry = CacheEntry[model_cls].model_validate_json(content)
                
                if datetime.now() > entry.expires_at:
                    await self.invalidate(key)
                    return None
                    
                return entry.data
        except Exception as e:
            # Log error but don't raise - treat as cache miss
            return None

    async def set(self, key: str, data: T) -> None:
        """
        Store data in cache with expiration.
        
        Args:
            key: The cache key
            data: The data to cache
        """
        cache_key = self._get_cache_key(key)
        cache_path = self._get_cache_path(cache_key)
        
        now = datetime.now()
        entry = CacheEntry(
            data=data,
            created_at=now,
            expires_at=now + timedelta(hours=self.ttl_hours)
        )
        
        async with aiofiles.open(cache_path, 'w') as f:
            await f.write(entry.model_dump_json())

    async def invalidate(self, key: str) -> None:
        """
        Remove a specific entry from cache.
        
        Args:
            key: The cache key to invalidate
        """
        cache_key = self._get_cache_key(key)
        cache_path = self._get_cache_path(cache_key)
        
        try:
            if cache_path.exists():
                os.remove(cache_path)
        except Exception:
            # Log error but continue - best effort deletion
            pass

    async def clear(self) -> None:
        """Clear all cache entries."""
        try:
            for cache_file in self.cache_dir.glob("*.json"):
                os.remove(cache_file)
        except Exception:
            # Log error but continue - best effort deletion
            pass
