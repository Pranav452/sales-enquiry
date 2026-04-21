import { ChatView } from "@/components/chat/ChatView"

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>
}) {
  const params = await searchParams
  return <ChatView initialRoomId={params.room ?? null} />
}
