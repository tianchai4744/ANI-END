const CACHE_NAME = 'ani-end-v1';
// ✅ กำหนด Path ของ GitHub Pages (ถ้าเปลี่ยนชื่อ Repo ต้องแก้ตรงนี้)
const GH_PATH = '/ANI-END'; 

const ASSETS_TO_CACHE = [
  `${GH_PATH}/`,
  `${GH_PATH}/index.html`,
  `${GH_PATH}/style.css`,
  `${GH_PATH}/favicon.ico`
  // เราจะไม่แคชรูปอนิเมะเยอะๆ เพราะจะหนักเครื่อง
];

// 1. Install Event: เก็บไฟล์ลง Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event: ลบ Cache เก่า
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

// 3. Fetch Event: โหลดจาก Cache ก่อน
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // กรณี Offline และหาไฟล์ไม่เจอ
      });
    })
  );
});
