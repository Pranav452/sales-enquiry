'use client'

import { useEffect, useRef } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(userId: string) {
  const doneRef = useRef(false)

  useEffect(() => {
    if (doneRef.current || !userId) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    doneRef.current = true

    async function init() {
      try {
        // Register SW
        await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        // Request permission if not yet decided
        if (Notification.permission === 'denied') return
        if (Notification.permission === 'default') {
          const granted = await Notification.requestPermission()
          if (granted !== 'granted') return
        }

        const reg = await navigator.serviceWorker.ready

        // Re-use existing subscription if present
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ) as unknown as ArrayBuffer,
          })
        }

        await fetch('/api/push/subscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(sub),
        })
      } catch (err) {
        console.warn('[push] setup failed:', err)
      }
    }

    init()
  }, [userId])
}
