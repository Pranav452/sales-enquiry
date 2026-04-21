import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface DockItem {
  roomId: string
  minimized: boolean
}

interface ChatDockStore {
  items: DockItem[]
  openChat:       (roomId: string) => void  // add or bring to front + un-minimize
  closeChat:      (roomId: string) => void  // remove from dock
  toggleMinimize: (roomId: string) => void
}

export const useChatDock = create<ChatDockStore>()(
  persist(
    (set) => ({
      items: [],

      openChat: (roomId) =>
        set((s) => {
          const exists = s.items.some((i) => i.roomId === roomId)
          if (exists) {
            // Move to end (rightmost panel) and un-minimize
            return {
              items: [
                ...s.items.filter((i) => i.roomId !== roomId),
                { roomId, minimized: false },
              ],
            }
          }
          return { items: [...s.items, { roomId, minimized: false }] }
        }),

      closeChat: (roomId) =>
        set((s) => ({ items: s.items.filter((i) => i.roomId !== roomId) })),

      toggleMinimize: (roomId) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.roomId === roomId ? { ...i, minimized: !i.minimized } : i
          ),
        })),
    }),
    { name: "chat-dock-v1" }
  )
)
