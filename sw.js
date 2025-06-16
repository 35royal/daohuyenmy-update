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

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                // Nếu tài nguyên đã có trong cache, trả về từ cache
                if (cachedResponse) {
                    console.log("From cache:", requestUrl.pathname);
                    return cachedResponse;
                }

                // Nếu không có trong cache, tải từ mạng
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Chỉ cache các phản hồi hợp lệ và các file cần thiết
                        if (
                            networkResponse.ok &&
                            requestUrl.pathname.match(/\.(ico|html|jpg|json|mp4|webm|ogg)$/i)
                        ) {
                            console.log("Caching:", requestUrl.pathname);
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch((err) => {
                        console.error("Fetch failed:", err);
                        // Trả về trang offline nếu không tải được
                        return caches.match(`${REPOSITORY_ROOT}offline.html`);
                    });
            });
        })
    );
});