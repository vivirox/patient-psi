import 'server-only'

import {
  createAI,
  getMutableAIState,
  getAIState,
  createStreamableValue
} from 'ai/rsc'
import OpenAI from 'openai'

import {
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage, BotMessage } from '@/components/message'
import { Chat } from '@/lib/types'
import { auth } from '@/auth'

import { getPrompt } from '@/app/api/getDataFromKV'


const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.OPENAI_API_KEY || 'sk-bf366a60261243b9a126acfb8c3aa45a'
})

async function testCompletion() {
  const completion = await openai.chat.completions.create({
    model: 'heallama',
    messages: [{ role: 'user', content: 'Why is the sky blue?' }]
  })
  return completion;
}

async function submitUserMessage(content: string, type: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content,
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const ui = streamUI({
    model: 'gpt-4',
    provider: openai,
    initial: <SpinnerMessage />,
    messages: [
      {
        role: 'system',
        content: await getPrompt()
      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name || ''
      }))
    ],
    text: ({ content, done, delta }: { content: string, done: boolean, delta: string }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    }
  })

  return {
    id: nanoid(),
    display: ui
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'data'
  content: string
  id: string
  name?: string
}

export type AIState = {
  chatId: string
  messages: Array<Message>
}

export type UIState = Array<{
  id: string
  display: React.ReactNode
}>

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session?.user) {
      const aiState = getAIState()

      if (aiState) {
        return getUIStateFromAIState(aiState as Chat)
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state, done }) => {
    'use server'

    const session = await auth()

    if (session?.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`
      const title = messages[0].content.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
      return;
    }
    return
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'user' ? (
          <UserMessage>{message.content}</UserMessage>
        ) : (
          <BotMessage content={message.content} />
        )
    }))
}
async function* streamUI({ model, provider, initial, messages, text }: { model: string, provider: OpenAI, initial: React.ReactNode, messages: Array<{ role: string, content: string, name?: string }>, text: ({ content, done, delta }: { content: string, done: boolean, delta: string }) => React.ReactNode }) {
  const response = await provider.chat.completions.create({
    model,
    messages: messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
      ...(msg.name && { name: msg.name })
    })),
    stream: true
  })
  yield initial;

  for await (const chunk of response) {
    const content = chunk.choices[0].delta.content;
    const done = chunk.choices[0].finish_reason === 'stop';
    yield text({ content: content ?? '', done, delta: content ?? '' });
  }
}

