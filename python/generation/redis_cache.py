import json
import logging
from typing import Optional, TypeVar, Generic
from datetime import datetime, timedelta
import aioredis
from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar('T')

class RedisCacheConfig(BaseModel):
    """Configuration for Redis cache."""
    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: Optional[str] = None
    ttl_hours: int = 24
    prefix: str = "psi:"

class RedisCache(Generic[T]):
    """Redis-based caching implementation."""
    
    def __init__(self, config: RedisCacheConfig):
        self.config = config
        self.redis: Optional[aioredis.Redis] = None
        
    async def connect(self) -> None:
        """Establish connection to Redis."""
        try:
            self.redis = await aioredis.from_url(
                f"redis://{self.config.host}:{self.config.port}",
                password=self.config.password,
                db=self.config.db,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis.ping()
            logger.info("Successfully connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise

    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            logger.info("Disconnected from Redis")

    def _get_key(self, key: str) -> str:
        """Generate Redis key with prefix."""
        return f"{self.config.prefix}{key}"

    async def get(self, key: str, model_cls: type[T]) -> Optional[T]:
        """
        Retrieve data from Redis cache.
        
        Args:
            key: Cache key
            model_cls: Pydantic model class for type validation
            
        Returns:
            Cached data if found and valid, None otherwise
        """
        if not self.redis:
            await self.connect()
            
        try:
            data = await self.redis.get(self._get_key(key))
            if not data:
                return None
                
            cached_data = json.loads(data)
            return model_cls.model_validate(cached_data)
        except Exception as e:
            logger.error(f"Error retrieving from Redis cache: {str(e)}")
            return None

    async def set(self, key: str, data: T) -> None:
        """
        Store data in Redis cache.
        
        Args:
            key: Cache key
            data: Data to cache
        """
        if not self.redis:
            await self.connect()
            
        try:
            json_data = json.dumps(
                data.model_dump() if hasattr(data, 'model_dump') else data
            )
            await self.redis.setex(
                self._get_key(key),
                timedelta(hours=self.config.ttl_hours),
                json_data
            )
        except Exception as e:
            logger.error(f"Error setting Redis cache: {str(e)}")

    async def invalidate(self, key: str) -> None:
        """
        Remove a specific entry from cache.
        
        Args:
            key: Cache key to invalidate
        """
        if not self.redis:
            await self.connect()
            
        try:
            await self.redis.delete(self._get_key(key))
        except Exception as e:
            logger.error(f"Error invalidating Redis cache: {str(e)}")

    async def clear(self) -> None:
        """Clear all cache entries with prefix."""
        if not self.redis:
            await self.connect()
            
        try:
            cursor = 0
            while True:
                cursor, keys = await self.redis.scan(
                    cursor,
                    match=f"{self.config.prefix}*",
                    count=100
                )
                if keys:
                    await self.redis.delete(*keys)
                if cursor == 0:
                    break
        except Exception as e:
            logger.error(f"Error clearing Redis cache: {str(e)}")

    async def get_stats(self) -> dict:
        """Get cache statistics."""
        if not self.redis:
            await self.connect()
            
        try:
            info = await self.redis.info()
            keys = await self.redis.keys(f"{self.config.prefix}*")
            return {
                "total_keys": len(keys),
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "last_save_time": datetime.fromtimestamp(
                    info.get("rdb_last_save_time", 0)
                ).isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting Redis stats: {str(e)}")
            return {}
