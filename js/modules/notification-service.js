// ✅ แก้ไข: เปลี่ยนจาก CDN เป็น npm package เพื่อให้ทำงานร่วมกับ db-config ได้
import { collection, getDocs, query, limit, doc, getDoc } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

export async function initNotificationSystem(userId) {
    const btn = document.getElementById('btn-notification');
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notification-list');
    const dropdown = document.getElementById('notification-dropdown');

    if (!btn || !badge || !list || !dropdown) return;

    try {
        // 1. ดึงรายการโปรด
        const bookmarksRef = collection(db, `artifacts/${appId}/users/${userId}/bookmarks`);
        const bookmarksSnap = await getDocs(query(bookmarksRef, limit(20)));
        
        if (bookmarksSnap.empty) {
            badge.classList.add('hidden');
            return;
        }

        // 2. ดึงประวัติการดู
        const historyRef = collection(db, `artifacts/${appId}/users/${userId}/viewHistory`);
        const historySnap = await getDocs(query(historyRef));
        const historyMap = new Map();
        historySnap.forEach(doc => historyMap.set(doc.data().showId, doc.data().lastWatchedEpisodeNumber || 0));

        let notifications = [];

        // 3. เปรียบเทียบ: ตอนล่าสุดในระบบ > ตอนที่ดูล่าสุด
        for (const docSnap of bookmarksSnap.docs) {
            const showId = docSnap.id;
            const showDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/shows`, showId));
            
            if (!showDoc.exists()) continue;
            
            const showData = showDoc.data();
            const latestEp = showData.latestEpisodeNumber || 0;
            const lastWatched = historyMap.get(showId) || 0;

            if (latestEp > lastWatched) {
                notifications.push({
                    title: showData.title,
                    ep: latestEp,
                    id: showId,
                    thumbnail: showData.thumbnailUrl
                });
            }
        }

        // 4. แสดงผล
        if (notifications.length > 0) {
            badge.textContent = notifications.length;
            badge.classList.remove('hidden');
            
            const currentPath = window.location.pathname;
            const prefix = currentPath.includes('/pages/') ? '' : 'pages/';
            
            let html = '';
            notifications.forEach(n => {
                html += `
                    <a href="${prefix}player.html?id=${n.id}&ep_id=latest" class="block p-3 hover:bg-gray-700 border-b border-gray-700 last:border-0 flex gap-3 items-center transition-colors">
                        <img src="${n.thumbnail}" class="w-10 h-14 object-cover rounded bg-gray-700" onerror="this.src='https://placehold.co/40x60'">
                        <div class="min-w-0">
                            <p class="text-xs text-green-400 font-bold">ตอนใหม่! ตอนที่ ${n.ep}</p>
                            <p class="text-sm text-white truncate">${n.title}</p>
                        </div>
                    </a>
                `;
            });
            list.innerHTML = html;
        } else { 
            badge.classList.add('hidden'); 
            list.innerHTML = '<p class="text-center text-gray-500 text-xs p-4">ไม่มีการแจ้งเตือนใหม่</p>';
        }

        // Toggle Dropdown Logic
        btn.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); };
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) dropdown.classList.add('hidden');
        });

    } catch (e) { 
        console.error("Notification Error:", e); 
    }
}
