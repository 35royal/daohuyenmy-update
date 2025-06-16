const CACHE_NAME = "tiktok-clone-v1";
const REPOSITORY_ROOT = "/daohuyenmy-clone/";

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

    // Xử lý tất cả các yêu cầu, đặc biệt là video
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                // Nếu tài nguyên có trong cache, trả về từ cache
                if (cachedResponse) {
                    console.log("Serving from cache:", requestUrl.pathname);
                    // Kiểm tra nếu yêu cầu có tiêu đề Range
                    const rangeHeader = event.request.headers.get("range");
                    if (rangeHeader && cachedResponse.ok) {
                        // Lấy toàn bộ nội dung từ cache
                        return cachedResponse.blob().then((blob) => {
                            const rangeMatch = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
                            if (!rangeMatch) {
                                return new Response(blob, {
                                    status: 200,
                                    headers: cachedResponse.headers
                                });
                            }

                            const start = parseInt(rangeMatch[1], 10);
                            const endMatch = rangeMatch[2];
                            const end = endMatch ? parseInt(endMatch, 10) : blob.size - 1;
                            const slicedBlob = blob.slice(start, end + 1);

                            return new Response(slicedBlob, {
                                status: 206,
                                statusText: "Partial Content",
                                headers: new Headers({
                                    "Content-Range": `bytes ${start}-${end}/${blob.size}`,
                                    "Content-Length": `${end - start + 1}`,
                                    "Content-Type": cachedResponse.headers.get("Content-Type") || "video/mp4"
                                })
                            });
                        });
                    }
                    return cachedResponse;
                }

                // Nếu không có trong cache, tải từ mạng và lưu vào cache
                console.log("Fetching from network:", requestUrl.pathname);
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
                        return caches.match(`${REPOSITORY_ROOT}offline.html`);
                    });
            });
        })
    );
});