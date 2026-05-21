self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'MFP Reference', {
      body: data.body ?? '',
      icon: '/jar-logosm.png',
      badge: '/jar-logosm.png',
      data: { url: data.url ?? '/publications' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/publications'
  event.waitUntil(clients.openWindow(url))
})
