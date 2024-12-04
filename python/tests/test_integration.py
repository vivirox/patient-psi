import pytest
import os
import json
from pathlib import Path
from generation.generate import GenerationService, GenerationConfig, GenerationError
from generation.generation_template import CognitiveConceptualizationDiagram

# Test data
TEST_TRANSCRIPT = """
Therapist: How have you been feeling lately?
Patient: I've been struggling with work. I feel like I can't keep up with deadlines.
Therapist: That sounds challenging. How does it affect you?
Patient: I feel anxious all the time. I worry that I'm not good enough.
"""

@pytest.fixture
def test_data_dir(tmp_path):
    """Create a temporary directory for test data."""
    data_dir = tmp_path / "test_data"
    data_dir.mkdir()
    return data_dir

@pytest.fixture
def test_transcript_file(test_data_dir):
    """Create a test transcript file."""
    transcript_path = test_data_dir / "test_transcript.txt"
    transcript_path.write_text(TEST_TRANSCRIPT)
    return str(transcript_path)

@pytest.fixture
def generation_service():
    """Create a generation service with test configuration."""
    config = GenerationConfig(
        model="llama2",
        temperature=0.7,
        max_attempts=2,
        stream=False,
        cache_ttl_hours=1
    )
    return GenerationService(config)

@pytest.mark.integration
@pytest.mark.asyncio
async def test_end_to_end_generation(generation_service, test_transcript_file):
    """Test end-to-end generation process."""
    # Generate CCD
    result = await generation_service.generate_ccd(test_transcript_file)
    
    # Verify result structure
    assert isinstance(result, CognitiveConceptualizationDiagram)
    assert len(result.cognitive_models) >= 3
    assert result.core_beliefs in ["Helpless belief", "Unlovable belief", "Worthless belief"]
    
    # Verify cognitive models
    for model in result.cognitive_models:
        assert model.situation
        assert model.automatic_thoughts
        assert model.emotion
        assert model.behavior

@pytest.mark.integration
@pytest.mark.asyncio
async def test_caching_behavior(generation_service, test_transcript_file):
    """Test caching functionality."""
    # First generation
    result1 = await generation_service.generate_ccd(test_transcript_file)
    
    # Second generation (should use cache)
    result2 = await generation_service.generate_ccd(test_transcript_file)
    
    # Results should be identical
    assert result1.model_dump() == result2.model_dump()
    
    # Force refresh should generate new
    result3 = await generation_service.generate_ccd(test_transcript_file, force_refresh=True)
    assert result1.model_dump() != result3.model_dump()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_error_handling(generation_service, test_transcript_file):
    """Test error handling and retry mechanism."""
    # Test with non-existent file
    with pytest.raises(GenerationError):
        await generation_service.generate_ccd("nonexistent.txt")
    
    # Test with invalid model
    bad_config = GenerationConfig(
        model="nonexistent_model",
        temperature=0.7,
        max_attempts=2,
        stream=False,
        cache_ttl_hours=1
    )
    bad_service = GenerationService(bad_config)
    
    with pytest.raises(GenerationError):
        await bad_service.generate_ccd(test_transcript_file)

@pytest.mark.integration
@pytest.mark.asyncio
async def test_streaming_generation(test_transcript_file):
    """Test streaming generation."""
    config = GenerationConfig(
        model="llama2",
        temperature=0.7,
        max_attempts=2,
        stream=True,
        cache_ttl_hours=1
    )
    service = GenerationService(config)
    
    # Test streaming generation
    chunks = []
    async for chunk in service.generate_ccd_stream(test_transcript_file):
        chunks.append(chunk)
    
    # Verify we got some output
    assert len(chunks) > 0
    
    # Try to parse the combined output
    combined = "".join(chunks)
    assert combined  # Should not be empty

@pytest.mark.integration
@pytest.mark.asyncio
async def test_concurrent_generation(generation_service, test_transcript_file):
    """Test concurrent generation requests."""
    # Create multiple concurrent generation tasks
    tasks = [
        generation_service.generate_ccd(test_transcript_file)
        for _ in range(3)
    ]
    
    # Run tasks concurrently
    results = await asyncio.gather(*tasks)
    
    # Verify all results are valid
    for result in results:
        assert isinstance(result, CognitiveConceptualizationDiagram)
        assert len(result.cognitive_models) >= 3
