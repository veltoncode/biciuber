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
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "BiciTaxi";
    
    const options = {
      body: data.body || "",
      icon: data.icon || "/icons/bicitaxi-afua.png",
      badge: data.badge || "/icons/bicitaxi-afua.png",
      vibrate: [200, 100, 200],
      tag: data.tag || "bicitaxi-notification",
      renotify: true,
      data: data.data || { url: "/" }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error("Error parsing push payload", e);
  }
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