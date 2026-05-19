// Sales Bridge — Service Worker
// Handles Web Push events and postMessage from client pages

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Sales Bridge', body: event.data.text() } }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Sales Bridge', {
      body:              data.body || '',
      icon:              '/favicon.ico',
      badge:             '/favicon.ico',
      tag:               data.tag || 'default',
      data:              { url: data.url || '/' },
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(url)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// Client pages postMessage → show local notification (works when tab is hidden/background)
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SHOW_NOTIFICATION') return
  const { title, body, url, tag } = event.data
  self.registration.showNotification(title || 'Sales Bridge', {
    body:              body || '',
    icon:              '/favicon.ico',
    badge:             '/favicon.ico',
    tag:               tag || 'notification',
    data:              { url: url || '/' },
    requireInteraction: false,
  })
})
