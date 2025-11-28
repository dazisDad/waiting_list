// Minimal service worker for notification support
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Get URL from notification data
  const urlToOpen = event.notification.data?.url;
  
  // If no URL specified, just close the notification and do nothing
  if (!urlToOpen) {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no matching window found, open new window or focus first available
      if (clientList.length > 0) {
        return clientList[0].focus().then(() => clientList[0].navigate(urlToOpen));
      }
      // No windows open, create new one
      return clients.openWindow(urlToOpen);
    })
  );
});
