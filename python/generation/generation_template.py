from typing import List, Literal
from pydantic import BaseModel, Field, field_validator
from langchain_core.prompts import ChatPromptTemplate
import re


class CognitiveModel(BaseModel):
    situation: str = Field(
        ...,
        description="The context or specific event that triggers a thought process or emotional response. Examples: `Thinking about bills`, `Thinking of asking son for help in revising resume`, `Memory of being criticized by boss`",
        min_length=10,
        max_length=500
    )
    
    automatic_thoughts: str = Field(
        ...,
        description="These are spontaneous thoughts that occur in response to a situation, often without conscious control. Examples: `What if I run out of money?`, `I should be able to do this on my own.`, `I should have tried harder.`",
        min_length=5,
        max_length=500
    )
    
    emotion: str = Field(
        ...,
        description="The feelings or emotions that arise in response to the automatic thoughts. You must pick at most three of the emotions in this set: `sad/down/lonely/unhappy`, `anxious/worried/fearful/scared/tense`, `angry/mad/irritated/annoyed`, `ashamed/humiliated/embarrassed`, `disappointed`, `jealous/envious`, `guilty`, `hurt`, `suspicious`"
    )
    
    behavior: str = Field(
        ...,
        description="The actions or behaviors that result from the emotions and thoughts. Examples: `Continues to sit on couch; ruminates about his failures`, `Avoids asking son for help`, `Ruminates about what a failure he was`",
        min_length=10,
        max_length=500
    )

    @field_validator('emotion')
    def validate_emotion(cls, v):
        valid_emotions = {
            'sad/down/lonely/unhappy',
            'anxious/worried/fearful/scared/tense',
            'angry/mad/irritated/annoyed',
            'ashamed/humiliated/embarrassed',
            'disappointed',
            'jealous/envious',
            'guilty',
            'hurt',
            'suspicious'
        }
        emotions = [e.strip() for e in v.split(',')]
        if len(emotions) > 3:
            raise ValueError("Maximum of 3 emotions allowed")
        
        for emotion in emotions:
            if emotion not in valid_emotions:
                raise ValueError(f"Invalid emotion: {emotion}")
        return v


class CognitiveConceptualizationDiagram(BaseModel):
    life_history: str = Field(
        ...,
        description="This field is intended to capture important background information about the patient, such as significant life events or circumstances that may have contributed to their current mental state or behavior.",
        min_length=50,
        max_length=1000
    )
    
    core_beliefs: Literal['Helpless belief', 'Unlovable belief', 'Worthless belief'] = Field(
        ...,
        description="Core beliefs are fundamental, deeply held beliefs that a person has about themselves, others, or the world. These are often central to a person's identity and worldview, and in CBT, are considered to influence how they interpret experiences. You must choose at least one core belief category from the 3 buckets: `Helpless belief`, `Unlovable belief`, and `Worthless belief`"
    )
    
    core_belief_description: str = Field(
        ...,
        description="Given the core belief you have choose, pick one or more of the descriptions from the selected core belief category: If it is Helpless belief, pick at least one from `I am helpless`, `I am incompetent`, `I am powerless, weak, vulnerable`, `I am a victim`, `I am needy`, `I am trapped`, `I am out of control`, I am a failure, a loser`, `I am defective`. If it is Unlovable belief, pick at least one from `I am unlovable`, `I am unattractive`, `I am undesired, unwanted`, `I am bound to be rejected`, `I am bound to be abandoned`, `I am bound to be alone`. If it is Worthless belief, pick at least one from `I am worthless, a waste`, `I am immoral`, `I am bad - dangerous, toxic, evil`, `I don't deserve to live`."
    )
    
    intermediate_beliefs: str = Field(
        ...,
        description="These are beliefs that are not as deep-seated as core beliefs but still play a significant role in how a person interprets and interacts with the world. They often take the form of attitudes, rules, and assumptions.",
        min_length=20,
        max_length=500
    )
    
    intermediate_beliefs_during_depression: str = Field(
        ...,
        description="This field refers to the intermediate beliefs that are specifically active or prominent during periods of depression. It's aimed at understanding how these beliefs change or influence the person's thinking and behavior during depressive episodes.",
        min_length=20,
        max_length=500
    )
    
    coping_strategies: str = Field(
        ...,
        description="Coping strategies are the methods a person uses to deal with stress or difficult emotions. This could include both healthy strategies (like exercise, seeking social support) and unhealthy ones (like substance abuse, avoidance).",
        min_length=20,
        max_length=500
    )
    
    cognitive_models: List[CognitiveModel] = Field(
        ...,
        description="You must provide at least 3 distinct cognitive models based on the instructions.",
        min_items=3,
        max_items=5
    )

    @field_validator('core_belief_description')
    def validate_core_belief_description(cls, v, values):
        core_belief = values.data.get('core_beliefs')
        if not core_belief:
            return v
            
        descriptions = {
            'Helpless belief': [
                'I am helpless',
                'I am incompetent',
                'I am powerless, weak, vulnerable',
                'I am a victim',
                'I am needy',
                'I am trapped',
                'I am out of control',
                'I am a failure, a loser',
                'I am defective'
            ],
            'Unlovable belief': [
                'I am unlovable',
                'I am unattractive',
                'I am undesired, unwanted',
                'I am bound to be rejected',
                'I am bound to be abandoned',
                'I am bound to be alone'
            ],
            'Worthless belief': [
                'I am worthless, a waste',
                'I am immoral',
                'I am bad - dangerous, toxic, evil',
                "I don't deserve to live"
            ]
        }
        
        valid_descriptions = descriptions[core_belief]
        if not any(desc in v for desc in valid_descriptions):
            raise ValueError(f"Description must contain at least one valid description for {core_belief}")
        return v


class GenerationModel:
    prompt_template = ChatPromptTemplate.from_messages([
        ('system', '''You are a CBT therapist who is professional and empathetic. 
Now you just ended a therapy session with a patient. Your goal is to reconstruct 
the cognitive model of the patient based on your conversations. Be specific and 
detailed in your analysis, focusing on concrete examples and patterns from the 
session.'''),
        ('user', '''{query}

Format instructions:
{format_instructions}

You should follow the concepts of cognitive behavioral therapy and figure out 
the cognitive behavioral model of the patient from a therapy session. Make sure 
to identify specific patterns of thoughts, emotions, and behaviors that are 
relevant to the patient's situation.''')
