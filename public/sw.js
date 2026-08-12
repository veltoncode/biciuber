const CACHE_NAME = "bicitaxi-v4";

const CORE_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/bicitaxi-afua.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseCopy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put("/", responseCopy);
          });

          return response;
        })
        .catch(() => caches.match("/"))
    );

    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkResponse = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseCopy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseCopy);
            });
          }

          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkResponse;
    })
  );
});

// ==========================================
// PUSH NOTIFICATIONS
// ==========================================

self.addEventListener("push", (event) => {
  let title = "BiciTaxi";
  let options = {
    body: "Nova atualização recebida.",
    icon: "/icons/bicitaxi-afua.png",
    badge: "/icons/bicitaxi-afua.png",
    vibrate: [200, 100, 200],
    tag: "bicitaxi-notification",
    renotify: true,
    data: { url: "/" }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      if (data.title) title = data.title;
      if (data.body) options.body = data.body;
      if (data.icon) options.icon = data.icon;
      if (data.badge) options.badge = data.badge;
      if (data.tag) options.tag = data.tag;
      if (data.data) options.data = data.data;
    } catch (e) {
      console.error("Error parsing push payload", e);
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Procura uma janela já aberta do BiciTaxi
      let matchingClient = null;

      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url.includes(self.location.origin)) {
          matchingClient = windowClient;
          break;
        }
      }

      if (matchingClient) {
        // Foca a janela existente e (se o navegador permitir) navega para a url especificada
        matchingClient.focus();
        // Opcional: matchingClient.navigate(urlToOpen) - mas pode causar recarregamento indesejado no react. 
        // O foco geralmente basta pois o realtime cuida da atualização da tela.
      } else {
        // Se não houver janela aberta, abre uma nova
        clients.openWindow(urlToOpen);
      }
    })
  );
});