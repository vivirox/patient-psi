import OpenAI from 'openai';
import { nanoid } from '../utils';
import type { Message } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  path: string;
  messages: Message[];
  sharePath?: string;
}

export async function submitMessage(content: string, messages: Message[], systemPrompt: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    stream: true
  });

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(content);
      }
      controller.close();
    }
  });

  return {
    id: nanoid(),
    stream
  };
}

export async function saveChat(chat: Chat) {
  // TODO: Implement chat saving logic using your database
  return chat;
}

export function getUIState(messages: Message[]) {
  return messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${nanoid()}-${index}`,
      role: message.role,
      content: message.content
    }));
}
