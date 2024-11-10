import { type Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { auth } from '@/auth'
import { getChat, getMissingKeys } from '@/app/actions'
import { Chat } from '@/components/chat'
import { AI } from '@/lib/chat/actions'
import { Session } from '@/lib/types'
import type { Message } from '@/lib/chat/actions'

export interface ChatPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({
  params
}: ChatPageProps): Promise<Metadata> {
  const session = (await auth()) as Session | null

  if (!session || !session.user) {
    return {}
  }

  const chat = await getChat(params.id, session.user.id)
  return {
    title: chat?.title.toString().slice(0, 50) ?? 'Chat'
  }
}
export default async function ChatPage({ params }: ChatPageProps) {
  const session = (await getServerSession(auth())) as Session | null
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

  const filteredMessages = chat.messages.filter(
    (message): message is Message =>
      ['user', 'system', 'assistant', 'data'].includes(message.role) &&
      message.role !== 'function'
  )

  return (
    <AI initialAIState={{ chatId: chat.id, messages: filteredMessages }}>
      <Chat
        id={chat.id}
        session={session}
        initialMessages={filteredMessages}
        missingKeys={missingKeys}
      />
    </AI>
  )
}
function getServerSession(
  arg0: Promise<null>
): Session | PromiseLike<Session | null> | null {
  throw new Error('Function not implemented.')
}
