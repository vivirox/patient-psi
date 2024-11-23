import { type Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { auth } from '@/auth'
import { getChat, getMissingKeys } from '@/app/actions'
import { Chat } from '@/components/chat'
import { AI } from '@/lib/chat/actions'
import { Session } from '@/lib/types'

export interface ChatPageProps {
  params: {
    id: string
  }
}

type Message = {
  id: string
  role: 'user' | 'system' | 'assistant' | 'data'
  content: string
}

export async function generateMetadata({
  params
}: ChatPageProps): Promise<Metadata> {
  const session = await auth()

  if (!session?.user) {
    return {}
  }

  const chat = await getChat(params.id, session.user.id)
  return {
    title: chat?.title.toString().slice(0, 50) ?? 'Chat'
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = (await auth()) as Session
  const missingKeys = await getMissingKeys()

  if (!session?.user) {
    redirect(`/login?next=/chat/${params.id}`)
  }

  const userId = session.user.id as string
  const chat = await getChat(params.id, userId)

  if (!chat) {
    redirect('/')
  }

  if (chat?.userId !== session?.user?.id) {
    notFound()
  }

  // Await the AI component if it returns a Promise
  const AIComponent = await AI({
    initialAIState: { chatId: chat.id, messages: chat.messages as Message[] },
    children: <></>
  })

  return (
    <>
      {AIComponent}
      <Chat
        id={chat.id}
        session={session}
        initialMessages={chat.messages as Message[]}
        missingKeys={missingKeys}
      />
    </>
  )
}
