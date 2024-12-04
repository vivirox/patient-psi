import OpenAI from 'openai';
import { env } from './env';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

interface GenerateOptions {
  onToken?: (token: string) => void;
  systemPrompt?: string;
}

export async function generateAIResponse(
  userMessage: string,
  options: GenerateOptions = {}
): Promise<string> {
  const {
    onToken,
    systemPrompt = 'You are a helpful medical assistant. You help patients understand their conditions and treatments, but you DO NOT provide medical diagnoses or advice. Always refer patients to their healthcare provider for medical decisions.',
  } = options;

  try {
    if (onToken) {
      // Streaming response
      const stream = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullResponse += token;
          onToken(token);
        }
      }
      return fullResponse;
    } else {
      // Non-streaming response
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || '';
    }
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate response. Please try again.');
  }
}

// Function to validate if a message is appropriate for the medical context
export async function validateMessage(message: string): Promise<{
  isValid: boolean;
  reason?: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a content moderator for a medical chat system. 
          Evaluate if the message is appropriate and safe for a medical context.
          Check for:
          1. Requests for medical diagnoses
          2. Requests for prescription medications
          3. Harmful or dangerous medical advice
          4. Inappropriate or offensive content
          5. Personal health information that should be private
          
          Respond with JSON: { "isValid": boolean, "reason": string if invalid }`,
        },
        { role: 'user', content: message },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      isValid: result.isValid ?? true,
      reason: result.reason,
    };
  } catch (error) {
    console.error('Error validating message:', error);
    // Default to valid if validation fails
    return { isValid: true };
  }
}

// Function to extract medical entities for better context
export async function extractMedicalEntities(
  text: string
): Promise<{
  conditions?: string[];
  symptoms?: string[];
  medications?: string[];
  procedures?: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Extract medical entities from the text and categorize them.
          Return JSON with these categories:
          - conditions: medical conditions mentioned
          - symptoms: symptoms described
          - medications: medications referenced
          - procedures: medical procedures discussed
          
          Only include categories that are present in the text.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error('Error extracting medical entities:', error);
    return {};
  }
}

// Function to summarize chat history for context
export async function summarizeChatHistory(
  messages: { role: string; content: string }[]
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Summarize the key points of this medical conversation.
          Focus on:
          1. Main topics discussed
          2. Questions asked
          3. Important information shared
          4. Follow-up items
          
          Keep it concise and relevant for medical context.`,
        },
        {
          role: 'user',
          content: JSON.stringify(messages),
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error summarizing chat history:', error);
    return '';
  }
}
