const CACHE_NAME = 'ani-end-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/favicon.ico'
  // เราจะไม่แคชรูปอนิเมะเยอะๆ เพราะจะหนักเครื่อง
];

// 1. Install Event: เก็บไฟล์พื้นฐานลง Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event: ลบ Cache เก่าทิ้งเมื่อมีการอัปเดต
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch Event: ดึงข้อมูลจาก Cache ก่อน ถ้าไม่มีค่อยโหลดจากเน็ต (Offline First)
self.addEventListener('fetch', (event) => {
  // ข้ามการแคชพวก API หรือ Firestore
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // ถ้าออฟไลน์และหาไม่เจอ ให้ทำอะไรต่อก็ได้ (เช่นโชว์หน้า Offline)
      });
    })
  );
});
