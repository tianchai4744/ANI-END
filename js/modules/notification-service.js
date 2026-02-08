// js/modules/notification-service.js

// ✅ ใช้ Import จาก Firebase SDK โดยตรง (ตาม Architecture ใหม่ของคุณ)
import { collection, getDocs, query, limit, doc, getDoc } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

// ชื่อ Key สำหรับเก็บข้อมูลการอ่านใน LocalStorage (เก็บที่ฝั่ง Client ไม่ต้องกวน Database)
const STORAGE_KEY_READ = 'ani_notif_read_ids';

export async function initNotificationSystem(userId) {
    const btn = document.getElementById('btn-notification');
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notification-list');
    const dropdown = document.getElementById('notification-dropdown');

    if (!btn || !badge || !list || !dropdown) return;

    try {
        // 1. ดึงรายการโปรด (Bookmarks)
        const bookmarksRef = collection(db, `artifacts/${appId}/users/${userId}/bookmarks`);
        const bookmarksSnap = await getDocs(query(bookmarksRef, limit(20)));
        
        if (bookmarksSnap.empty) {
            badge.classList.add('hidden');
            return;
        }

        // 2. ดึงประวัติการดู (History) เพื่อเทียบว่าดูถึงไหนแล้ว
        const historyRef = collection(db, `artifacts/${appId}/users/${userId}/viewHistory`);
        const historySnap = await getDocs(query(historyRef));
        const historyMap = new Map();
        historySnap.forEach(doc => historyMap.set(doc.data().showId, doc.data().lastWatchedEpisodeNumber || 0));

        // 3. โหลดรายการที่เคย "คลิกอ่านแล้ว" จาก LocalStorage
        let readNotifications = [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY_READ);
            readNotifications = raw ? JSON.parse(raw) : [];
        } catch (e) {
            readNotifications = [];
        }

        let notifications = [];
        let unreadCount = 0;

        // 4. คำนวณการแจ้งเตือน: ตอนล่าสุดในระบบ > ตอนที่ดูล่าสุด
        for (const docSnap of bookmarksSnap.docs) {
            const showId = docSnap.id;
            const showDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/shows`, showId));
            
            if (!showDoc.exists()) continue;
            
            const showData = showDoc.data();
            const latestEp = showData.latestEpisodeNumber || 0;
            const lastWatched = historyMap.get(showId) || 0;

            if (latestEp > lastWatched) {
                // สร้าง ID เฉพาะสำหรับการแจ้งเตือนนี้ (ShowID + EpisodeNumber)
                const notifId = `${showId}_ep${latestEp}`;
                const isRead = readNotifications.includes(notifId);

                // นับยอด Badge เฉพาะที่ยังไม่อ่าน
                if (!isRead) unreadCount++;

                notifications.push({
                    title: showData.title,
                    ep: latestEp,
                    id: showId,
                    thumbnail: showData.thumbnailUrl,
                    notifId: notifId, // ID สำหรับเช็คสถานะอ่าน
                    isRead: isRead
                });
            }
        }

        // 5. แสดงผล (Render UI)
        if (notifications.length > 0) {
            // แสดง Badge สีแดงเฉพาะถ้ามีข้อความยังไม่อ่าน
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
            
            const currentPath = window.location.pathname;
            const prefix = currentPath.includes('/pages/') ? '' : 'pages/';
            
            let html = '';
            notifications.forEach(n => {
                // Style: ถ้าอ่านแล้วให้จางลง (opacity) และเป็นสีขาวดำ (grayscale)
                const readStyle = n.isRead ? 'opacity-50 grayscale bg-gray-900/50' : 'hover:bg-gray-700 bg-transparent';
                const textStyle = n.isRead ? 'text-gray-500' : 'text-green-400';

                // Link: ส่งแค่ ID เพื่อให้ Player.js ตัดสินใจ Resume เอง
                html += `
                    <a href="${prefix}player.html?id=${n.id}" 
                       data-nid="${n.notifId}"
                       class="notif-item block p-3 border-b border-gray-700 last:border-0 flex gap-3 items-center transition-all ${readStyle}">
                        <img src="${n.thumbnail}" class="w-10 h-14 object-cover rounded bg-gray-700" onerror="this.src='https://placehold.co/40x60'">
                        <div class="min-w-0">
                            <p class="text-xs font-bold ${textStyle}">ตอนใหม่! ตอนที่ ${n.ep}</p>
                            <p class="text-sm text-white truncate">${n.title}</p>
                        </div>
                    </a>
                `;
            });
            list.innerHTML = html;

            // Event Listener: คลิกแล้วบันทึกสถานะว่า "อ่านแล้ว"
            const items = list.querySelectorAll('.notif-item');
            items.forEach(item => {
                item.addEventListener('click', function() {
                    const nid = this.getAttribute('data-nid');
                    if (nid) {
                        markAsRead(nid); // บันทึกลง Storage
                    }
                });
            });

        } else { 
            badge.classList.add('hidden'); 
            list.innerHTML = '<p class="text-center text-gray-500 text-xs p-4">ไม่มีการแจ้งเตือนใหม่</p>';
        }

        // Dropdown Toggle Logic (เปิด/ปิด เมนู)
        btn.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); };
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) dropdown.classList.add('hidden');
        });

    } catch (e) { 
        console.error("Notification Error:", e); 
    }
}

// Helper: ฟังก์ชันบันทึกสถานะลง LocalStorage
function markAsRead(notifId) {
    try {
        let reads = [];
        const raw = localStorage.getItem(STORAGE_KEY_READ);
        if (raw) reads = JSON.parse(raw);
        
        if (!reads.includes(notifId)) {
            reads.push(notifId);
            // จำกัดจำนวนการจำไว้ที่ 100 รายการล่าสุด เพื่อไม่ให้รกเครื่องผู้ใช้
            if (reads.length > 100) reads.shift(); 
            localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(reads));
        }
    } catch (e) {
        console.error("Failed to save read state", e);
    }
}
