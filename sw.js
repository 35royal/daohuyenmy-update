const CACHE_NAME = "tiktok-clone-v1";
const REPOSITORY_ROOT = "/daohuyenmy-update/";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                `${REPOSITORY_ROOT}favicon.ico`,
                `${REPOSITORY_ROOT}index.html`,
                `${REPOSITORY_ROOT}offline.html`,
                `${REPOSITORY_ROOT}placeholder.jpg`,
                `${REPOSITORY_ROOT}sw.js`,
                `${REPOSITORY_ROOT}videos.json`
            ]);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) =>
                    !cacheWhitelist.includes(cacheName) && caches.delete(cacheName)
                )
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    // Xử lý caching video (giống logic gốc)
    if (requestUrl.pathname.match(/\.(mp4|webm|ogg)$/i)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log("Video from cache:", requestUrl.pathname);
                        return cachedResponse;
                    }

                    return fetch(event.request).then((networkResponse) => {
                        if (networkResponse.ok) {
                            console.log("Caching video:", requestUrl.pathname);
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch((err) => {
                        console.error("Video fetch failed:", err);
                        return new Response("Video không khả dụng", { status: 503 });
                    });
                });
            })
        );
        return;
    }

    // Xử lý các tài nguyên khác
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log("From cache:", requestUrl.pathname);
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse.ok && requestUrl.pathname.match(/\.(ico|html|jpg|json)$/i)) {
                            console.log("Caching:", requestUrl.pathname);
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch((err) => {
                        console.error("Fetch failed:", err);
                        return caches.match(`${REPOSITORY_ROOT}offline.html`);
                    });
            });
        })
    );
});