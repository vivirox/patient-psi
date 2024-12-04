import asyncio
import logging
from typing import Dict, Any, Callable, Awaitable, Optional
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class TaskStatus(BaseModel):
    """Status of a background task."""
    id: str = Field(..., description="Unique task identifier")
    status: str = Field(..., description="Current status (pending, running, completed, failed)")
    created_at: datetime = Field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: float = Field(0.0, description="Progress percentage (0-100)")
    result: Optional[Any] = None
    error: Optional[str] = None

class TaskManager:
    """Manager for handling background tasks."""
    
    def __init__(self):
        self.tasks: Dict[str, TaskStatus] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        
    async def start(self):
        """Start the task manager."""
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("Task manager started")
        
    async def stop(self):
        """Stop the task manager."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("Task manager stopped")
        
    async def _cleanup_loop(self):
        """Periodically clean up completed tasks."""
        while True:
            try:
                current_time = datetime.now()
                to_remove = []
                
                for task_id, status in self.tasks.items():
                    if status.status in ['completed', 'failed']:
                        if status.completed_at:
                            age = (current_time - status.completed_at).total_seconds()
                            if age > 3600:  # Remove after 1 hour
                                to_remove.append(task_id)
                                
                for task_id in to_remove:
                    del self.tasks[task_id]
                    
                await asyncio.sleep(300)  # Check every 5 minutes
            except Exception as e:
                logger.error(f"Error in cleanup loop: {str(e)}")
                await asyncio.sleep(60)  # Wait a bit before retrying
                
    async def create_task(
        self,
        func: Callable[..., Awaitable[Any]],
        *args: Any,
        **kwargs: Any
    ) -> str:
        """
        Create and start a new background task.
        
        Args:
            func: Async function to execute
            *args: Positional arguments for the function
            **kwargs: Keyword arguments for the function
            
        Returns:
            Task ID
        """
        task_id = str(uuid4())
        
        self.tasks[task_id] = TaskStatus(
            id=task_id,
            status="pending"
        )
        
        asyncio.create_task(self._run_task(task_id, func, *args, **kwargs))
        logger.info(f"Created task {task_id}")
        
        return task_id
        
    async def _run_task(
        self,
        task_id: str,
        func: Callable[..., Awaitable[Any]],
        *args: Any,
        **kwargs: Any
    ) -> None:
        """
        Execute a task and update its status.
        
        Args:
            task_id: Task identifier
            func: Async function to execute
            *args: Positional arguments for the function
            **kwargs: Keyword arguments for the function
        """
        status = self.tasks[task_id]
        status.status = "running"
        status.started_at = datetime.now()
        
        try:
            result = await func(*args, **kwargs)
            status.status = "completed"
            status.result = result
        except Exception as e:
            logger.error(f"Task {task_id} failed: {str(e)}")
            status.status = "failed"
            status.error = str(e)
        finally:
            status.completed_at = datetime.now()
            status.progress = 100.0
            
    def get_status(self, task_id: str) -> Optional[TaskStatus]:
        """
        Get the status of a task.
        
        Args:
            task_id: Task identifier
            
        Returns:
            Task status if found, None otherwise
        """
        return self.tasks.get(task_id)
        
    def get_all_statuses(self) -> Dict[str, TaskStatus]:
        """
        Get status of all tasks.
        
        Returns:
            Dictionary of task IDs to their status
        """
        return self.tasks.copy()
