import os
import logging
import logging.config
import asyncio
from typing import AsyncGenerator, Optional
from pathlib import Path
from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser
from langchain_ollama import AsyncOllama
from .generation_template import GenerationModel, CognitiveConceptualizationDiagram
from .redis_cache import RedisCache, RedisCacheConfig
from .task_manager import TaskManager
from .metrics import MetricsCollector, track_metrics
from .error_handling import with_retries, RetryConfig, validate_model_availability
from .rate_limiter import RateLimiter, RateLimitConfig, with_rate_limit

# Configure logging
logging.config.fileConfig('logging.conf')
logger = logging.getLogger('generation')

class GenerationConfig(BaseModel):
    """Configuration for the generation service."""
    model: str = Field(..., description="Name of the Ollama model to use")
    temperature: float = Field(
        0.7,
        ge=0.0,
        le=1.0,
        description="Temperature for generation (0.0 to 1.0)"
    )
    max_attempts: int = Field(
        3,
        gt=0,
        description="Maximum number of retry attempts"
    )
    stream: bool = Field(
        False,
        description="Whether to stream the response"
    )
    cache_ttl_hours: int = Field(
        24,
        gt=0,
        description="Cache TTL in hours"
    )
    metrics_window_size: int = Field(
        1000,
        gt=0,
        description="Size of metrics rolling window"
    )
    requests_per_minute: int = Field(
        20,
        gt=0,
        description="Maximum requests per minute"
    )

class GenerationService:
    def __init__(self, config: GenerationConfig):
        self.config = config
        self.llm = AsyncOllama(
            model=config.model,
            temperature=config.temperature
        )
        
        # Initialize components
        self.cache = RedisCache[CognitiveConceptualizationDiagram](
            RedisCacheConfig(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', '6379')),
                password=os.getenv('REDIS_PASSWORD'),
                ttl_hours=config.cache_ttl_hours
            )
        )
        self.task_manager = TaskManager()
        self.metrics = MetricsCollector(window_size=config.metrics_window_size)
        self.rate_limiter = RateLimiter(
            RateLimitConfig(
                requests_per_minute=config.requests_per_minute
            )
        )
        self.template = GenerationModel()
        self.parser = PydanticOutputParser(pydantic_object=CognitiveConceptualizationDiagram)
        
    async def start(self):
        """Start the generation service."""
        await self.cache.connect()
        await self.task_manager.start()
        await self.metrics.start_monitoring()
        logger.info("Generation service started")
        
    async def stop(self):
        """Stop the generation service."""
        await self.cache.disconnect()
        await self.task_manager.stop()
        await self.metrics.stop_monitoring()
        logger.info("Generation service stopped")

    @track_metrics(collector=MetricsCollector())
    @with_retries(retry_config=RetryConfig())
    async def generate_ccd(
        self,
        transcript: str,
        force_refresh: bool = False
    ) -> CognitiveConceptualizationDiagram:
        """
        Generate a Cognitive Conceptualization Diagram from a therapy transcript.
        
        Args:
            transcript: The therapy session transcript
            force_refresh: If True, bypass cache and generate new
            
        Returns:
            CognitiveConceptualizationDiagram object
        """
        logger.info("Starting CCD generation")
        
        if not force_refresh:
            cached = await self.cache.get(transcript, CognitiveConceptualizationDiagram)
            if cached:
                logger.info("Returning cached CCD")
                return cached

        await validate_model_availability(self.llm)
        
        messages = self.template.prompt_template.format_messages(
            query=transcript,
            format_instructions=self.parser.get_format_instructions()
        )

        async def generate():
            response = await self.llm.ainvoke(messages)
            return self.parser.parse(response.content)

        result = await with_rate_limit(
            self.rate_limiter,
            self.config.model,
            generate
        )
        
        # Cache the result
        await self.cache.set(transcript, result)
        logger.info("Successfully generated and cached CCD")
        
        return result

    async def generate_ccd_async(
        self,
        transcript: str,
        force_refresh: bool = False
    ) -> str:
        """
        Start asynchronous generation of CCD.
        
        Args:
            transcript: The therapy session transcript
            force_refresh: If True, bypass cache and generate new
            
        Returns:
            Task ID for tracking progress
        """
        return await self.task_manager.create_task(
            self.generate_ccd,
            transcript,
            force_refresh
        )

    async def get_task_status(self, task_id: str):
        """
        Get status of an async generation task.
        
        Args:
            task_id: Task identifier
            
        Returns:
            Task status
        """
        return self.task_manager.get_status(task_id)

    @track_metrics(collector=MetricsCollector())
    async def generate_ccd_stream(
        self,
        transcript: str
    ) -> AsyncGenerator[str, None]:
        """
        Stream the generation of a CCD.
        
        Args:
            transcript: The therapy session transcript
            
        Yields:
            Chunks of the generated response
        """
        logger.info("Starting streaming CCD generation")
        
        await validate_model_availability(self.llm)

        messages = self.template.prompt_template.format_messages(
            query=transcript,
            format_instructions=self.parser.get_format_instructions()
        )

        async for chunk in self.llm.astream(messages):
            yield chunk.content

    async def get_metrics(self):
        """
        Get current metrics.
        
        Returns:
            Dictionary containing metrics
        """
        return {
            'generation': self.metrics.get_window_metrics().model_dump(),
            'system': self.metrics.get_system_metrics().model_dump(),
            'cache': await self.cache.get_stats()
        }

    async def clear_cache(self):
        """Clear the generation cache."""
        await self.cache.clear()
        logger.info("Cache cleared")


async def async_main(transcript_file: str, out_file: str, stream: bool = True) -> None:
    """Async main function."""
    config = GenerationConfig(
        model=os.getenv('OLLAMA_MODEL'),
        temperature=float(os.getenv('GENERATOR_MODEL_TEMP')),
        max_attempts=int(os.getenv('MAX_ATTEMPTS')),
        stream=stream,
        cache_ttl_hours=int(os.getenv('CACHE_TTL_HOURS')),
        metrics_window_size=int(os.getenv('METRICS_WINDOW_SIZE')),
        requests_per_minute=int(os.getenv('REQUESTS_PER_MINUTE'))
    )
    service = GenerationService(config)
    try:
        await service.start()
        if stream:
            async for chunk in service.generate_ccd_stream(transcript_file):
                print(chunk, end='')
        else:
            result = await service.generate_ccd(transcript_file)
            with open(out_file, 'w') as f:
                f.write(result.json())
    except Exception as e:
        logger.error(f"Generation failed: {str(e)}", exc_info=True)
        sys.exit(1)
    finally:
        await service.stop()


def main():
    """Synchronous entry point."""
    parser = argparse.ArgumentParser(description="Generate cognitive conceptualization diagram from transcript")
    parser.add_argument('--transcript-file', type=str,
                       default="example_transcript.txt",
                       help="Path to the transcript file (relative to DATA_PATH)")
    parser.add_argument('--out-file', type=str,
                       default="example_CCD_from_transcript.json",
                       help="Path to save the output (relative to OUT_PATH)")
    parser.add_argument('--no-stream', action='store_true',
                       help="Disable streaming output")
    
    args = parser.parse_args()
    
    # Run the async function
    asyncio.run(async_main(args.transcript_file, args.out_file, not args.no_stream))


if __name__ == "__main__":
    main()
