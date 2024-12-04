import time
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import deque
from pydantic import BaseModel
from functools import wraps
import asyncio
import psutil

logger = logging.getLogger(__name__)

class GenerationMetric(BaseModel):
    """Metric for a single generation request."""
    timestamp: datetime
    duration_ms: float
    success: bool
    error: Optional[str] = None
    model: str
    tokens: int
    cache_hit: bool

class SystemMetrics(BaseModel):
    """System resource metrics."""
    cpu_percent: float
    memory_percent: float
    disk_usage_percent: float
    open_files: int
    thread_count: int

class MetricsWindow(BaseModel):
    """Rolling window of metrics."""
    window_size: int
    success_rate: float
    avg_duration_ms: float
    p95_duration_ms: float
    total_requests: int
    cache_hit_rate: float
    error_rate: float
    common_errors: Dict[str, int]

class MetricsCollector:
    """Collector for generation and system metrics."""
    
    def __init__(self, window_size: int = 1000):
        self.metrics: deque[GenerationMetric] = deque(maxlen=window_size)
        self.window_size = window_size
        self._monitor_task: Optional[asyncio.Task] = None
        
    async def start_monitoring(self):
        """Start system monitoring."""
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info("Metrics monitoring started")
        
    async def stop_monitoring(self):
        """Stop system monitoring."""
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Metrics monitoring stopped")
        
    async def _monitor_loop(self):
        """Periodically collect system metrics."""
        while True:
            try:
                metrics = self.get_system_metrics()
                logger.info(f"System metrics: {metrics.model_dump()}")
                await asyncio.sleep(60)  # Collect every minute
            except Exception as e:
                logger.error(f"Error collecting system metrics: {str(e)}")
                await asyncio.sleep(60)
                
    def record_generation(
        self,
        duration_ms: float,
        success: bool,
        error: Optional[str],
        model: str,
        tokens: int,
        cache_hit: bool
    ):
        """
        Record metrics for a generation request.
        
        Args:
            duration_ms: Request duration in milliseconds
            success: Whether the request was successful
            error: Error message if failed
            model: Model used for generation
            tokens: Number of tokens generated
            cache_hit: Whether result was from cache
        """
        metric = GenerationMetric(
            timestamp=datetime.now(),
            duration_ms=duration_ms,
            success=success,
            error=error,
            model=model,
            tokens=tokens,
            cache_hit=cache_hit
        )
        self.metrics.append(metric)
        
    def get_window_metrics(self) -> MetricsWindow:
        """
        Calculate metrics over the current window.
        
        Returns:
            Rolling window metrics
        """
        if not self.metrics:
            return MetricsWindow(
                window_size=self.window_size,
                success_rate=0.0,
                avg_duration_ms=0.0,
                p95_duration_ms=0.0,
                total_requests=0,
                cache_hit_rate=0.0,
                error_rate=0.0,
                common_errors={}
            )
            
        total = len(self.metrics)
        successes = sum(1 for m in self.metrics if m.success)
        cache_hits = sum(1 for m in self.metrics if m.cache_hit)
        durations = sorted(m.duration_ms for m in self.metrics)
        errors = [m.error for m in self.metrics if m.error]
        
        error_counts: Dict[str, int] = {}
        for error in errors:
            if error:
                error_counts[error] = error_counts.get(error, 0) + 1
                
        return MetricsWindow(
            window_size=self.window_size,
            success_rate=successes / total if total > 0 else 0.0,
            avg_duration_ms=sum(durations) / total if total > 0 else 0.0,
            p95_duration_ms=durations[int(len(durations) * 0.95)] if durations else 0.0,
            total_requests=total,
            cache_hit_rate=cache_hits / total if total > 0 else 0.0,
            error_rate=(total - successes) / total if total > 0 else 0.0,
            common_errors=dict(sorted(
                error_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5])  # Top 5 errors
        )
        
    def get_system_metrics(self) -> SystemMetrics:
        """
        Get current system metrics.
        
        Returns:
            System resource metrics
        """
        process = psutil.Process()
        
        return SystemMetrics(
            cpu_percent=psutil.cpu_percent(),
            memory_percent=process.memory_percent(),
            disk_usage_percent=psutil.disk_usage('/').percent,
            open_files=len(process.open_files()),
            thread_count=process.num_threads()
        )
        
def track_metrics(collector: MetricsCollector):
    """
    Decorator to track generation metrics.
    
    Args:
        collector: Metrics collector instance
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            success = False
            error = None
            tokens = 0
            cache_hit = False
            
            try:
                result = await func(*args, **kwargs)
                success = True
                # Assuming result has token count and cache info
                tokens = getattr(result, 'token_count', 0)
                cache_hit = getattr(result, 'from_cache', False)
                return result
            except Exception as e:
                error = str(e)
                raise
            finally:
                duration_ms = (time.time() - start_time) * 1000
                collector.record_generation(
                    duration_ms=duration_ms,
                    success=success,
                    error=error,
                    model=kwargs.get('model', 'unknown'),
                    tokens=tokens,
                    cache_hit=cache_hit
                )
                
        return wrapper
    return decorator
