import pytest
import os
from typing import List
from generation.generate import GenerationService, GenerationConfig
from generation.generation_template import CognitiveModel, CognitiveConceptualizationDiagram

# Mock data for testing
MOCK_TRANSCRIPT = """
Patient: I've been feeling really overwhelmed lately with work and family responsibilities.
Therapist: Can you tell me more about what's been overwhelming you?
Patient: Well, I have these deadlines at work, and my kids need help with school, and I just feel like I can't keep up with everything.
Therapist: That sounds really challenging. How does it make you feel when you think about all these responsibilities?
Patient: I feel like a failure. Like I should be able to handle this better. Other people seem to manage just fine.
"""

@pytest.fixture
def generation_config():
    return GenerationConfig(
        model="llama2",
        temperature=0.7,
        max_attempts=3,
        stream=False
    )

@pytest.fixture
def generation_service(generation_config):
    return GenerationService(generation_config)

def test_cognitive_model_validation():
    # Test valid cognitive model
    valid_model = CognitiveModel(
        situation="Thinking about work deadlines",
        automatic_thoughts="I should be able to handle this better",
        emotion="anxious/worried/fearful/scared/tense",
        behavior="Avoids starting tasks, procrastinates"
    )
    assert valid_model is not None

    # Test invalid emotion
    with pytest.raises(ValueError):
        CognitiveModel(
            situation="Thinking about work deadlines",
            automatic_thoughts="I should be able to handle this better",
            emotion="invalid_emotion",
            behavior="Avoids starting tasks"
        )

    # Test multiple valid emotions
    valid_multiple_emotions = CognitiveModel(
        situation="Thinking about work deadlines",
        automatic_thoughts="I should be able to handle this better",
        emotion="anxious/worried/fearful/scared/tense, sad/down/lonely/unhappy",
        behavior="Avoids starting tasks"
    )
    assert valid_multiple_emotions is not None

def test_cognitive_conceptualization_diagram_validation():
    # Test valid diagram
    valid_diagram = CognitiveConceptualizationDiagram(
        life_history="Patient has a history of high academic achievement and family expectations",
        core_beliefs="Helpless belief",
        core_belief_description="I am incompetent",
        intermediate_beliefs="I must always be perfect",
        intermediate_beliefs_during_depression="If I can't do everything perfectly, I'm a complete failure",
        coping_strategies="Avoidance, procrastination, seeking reassurance",
        cognitive_models=[
            CognitiveModel(
                situation="Thinking about work deadlines",
                automatic_thoughts="I should be able to handle this better",
                emotion="anxious/worried/fearful/scared/tense",
                behavior="Avoids starting tasks"
            ),
            CognitiveModel(
                situation="Children asking for help with homework",
                automatic_thoughts="I'm not doing enough as a parent",
                emotion="guilty",
                behavior="Stays up late trying to help"
            ),
            CognitiveModel(
                situation="Missing a deadline",
                automatic_thoughts="I'm going to get fired",
                emotion="anxious/worried/fearful/scared/tense",
                behavior="Overworks to compensate"
            )
        ]
    )
    assert valid_diagram is not None

    # Test invalid core beliefs
    with pytest.raises(ValueError):
        CognitiveConceptualizationDiagram(
            life_history="Patient history",
            core_beliefs="Invalid belief",  # This should raise an error
            core_belief_description="I am incompetent",
            intermediate_beliefs="Test beliefs",
            intermediate_beliefs_during_depression="Test depression beliefs",
            coping_strategies="Test strategies",
            cognitive_models=[
                CognitiveModel(
                    situation="Test situation",
                    automatic_thoughts="Test thoughts",
                    emotion="anxious/worried/fearful/scared/tense",
                    behavior="Test behavior"
                ) for _ in range(3)
            ]
        )

@pytest.mark.asyncio
async def test_generation_service(generation_service):
    # Test successful generation
    result = await generation_service.generate_ccd(MOCK_TRANSCRIPT)
    assert isinstance(result, CognitiveConceptualizationDiagram)
    assert len(result.cognitive_models) >= 3
    assert result.core_beliefs in ["Helpless belief", "Unlovable belief", "Worthless belief"]

@pytest.mark.asyncio
async def test_generation_service_retries(generation_service):
    # Test retry mechanism
    # This would require mocking the LLM to simulate failures
    pass

@pytest.mark.asyncio
async def test_generation_service_streaming(generation_config):
    # Test streaming generation
    config = generation_config.copy()
    config.stream = True
    service = GenerationService(config)
    
    async for chunk in service.generate_ccd_stream(MOCK_TRANSCRIPT):
        assert isinstance(chunk, str)

def test_generation_config_validation():
    # Test valid config
    valid_config = GenerationConfig(
        model="llama2",
        temperature=0.7,
        max_attempts=3,
        stream=False
    )
    assert valid_config is not None

    # Test invalid temperature
    with pytest.raises(ValueError):
        GenerationConfig(
            model="llama2",
            temperature=2.0,  # Should be between 0 and 1
            max_attempts=3,
            stream=False
        )

    # Test invalid max_attempts
    with pytest.raises(ValueError):
        GenerationConfig(
            model="llama2",
            temperature=0.7,
            max_attempts=0,  # Should be positive
            stream=False
        )
