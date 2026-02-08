import { collection, getDocs, query, limit, doc, getDoc } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

const STORAGE_KEY_READ = 'ani_notif_read_ids';

export async function initNotificationSystem(userId) {
    const btn = document.getElementById('btn-notification');
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notification-list');
    const dropdown = document.getElementById('notification-dropdown');
    
    // เพิ่ม: อ้างอิงปุ่ม Mark All Read (ต้องไปเพิ่ม HTML ใน navbar ด้วย)
    const headerContainer = dropdown?.querySelector('.border-b'); 

    if (!btn || !badge || !list || !dropdown) return;

    // Loading State (แสดงระหว่างรอข้อมูล)
    list.innerHTML = `
        <div class="flex justify-center items-center py-8 text-gray-500">
            <i class="ri-loader-4-line animate-spin text-2xl"></i>
        </div>
    `;

    try {
        // 1. ดึง Bookmarks (เพิ่ม limit เป็น 50 เพื่อความครอบคลุม)
        const bookmarksRef = collection(db, `artifacts/${appId}/users/${userId}/bookmarks`);
        const bookmarksSnap = await getDocs(query(bookmarksRef, limit(50)));
        
        if (bookmarksSnap.empty) {
            updateBadge(0);
            renderEmptyState(list);
            return;
        }

        // 2. ดึง History
        const historyRef = collection(db, `artifacts/${appId}/users/${userId}/viewHistory`);
        const historySnap = await getDocs(query(historyRef));
        const historyMap = new Map();
        historySnap.forEach(doc => historyMap.set(doc.data().showId, doc.data().lastWatchedEpisodeNumber || 0));

        // 3. โหลด LocalStorage
        let readNotifications = getReadState();
        let notifications = [];
        let unreadIds = [];

        // 4. Logic เปรียบเทียบ
        // *Tip: ใช้ Promise.all เพื่อดึงข้อมูลพร้อมกันหลายๆ ตัว (เร็วกว่าวนลูปทีละตัว)*
        const promises = bookmarksSnap.docs.map(async (docSnap) => {
            const showId = docSnap.id;
            // *Optimization: ในอนาคตควร cache showData ไว้ใน localStorage เพื่อลดการ read*
            const showDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/shows`, showId));
            if (!showDoc.exists()) return null;

            const showData = showDoc.data();
            const latestEp = showData.latestEpisodeNumber || 0;
            const lastWatched = historyMap.get(showId) || 0;

            if (latestEp > lastWatched) {
                const notifId = `${showId}_ep${latestEp}`;
                const isRead = readNotifications.includes(notifId);
                
                if (!isRead) unreadIds.push(notifId);

                return {
                    title: showData.title,
                    ep: latestEp,
                    id: showId,
                    thumbnail: showData.thumbnailUrl,
                    notifId: notifId,
                    isRead: isRead,
                    // เพิ่ม Timestamp ปลอมๆ เพื่อใช้เรียงลำดับ (ของจริงควรมาจากวันที่อัปเดตอนิเมะ)
                    timestamp: showData.lastUpdated?.toMillis() || Date.now() 
                };
            }
            return null;
        });

        // รอจนครบทุกตัวและตัด null ทิ้ง
        const results = await Promise.all(promises);
        notifications = results.filter(n => n !== null);

        // เรียงลำดับ: ยังไม่อ่านขึ้นก่อน
        notifications.sort((a, b) => (a.isRead === b.isRead) ? 0 : a.isRead ? 1 : -1);

        // 5. Render
        if (notifications.length > 0) {
            updateBadge(unreadIds.length);
            
            // เพิ่มปุ่ม "อ่านทั้งหมด" ถ้ามีรายการที่ยังไม่อ่าน
            if (unreadIds.length > 0 && headerContainer && !document.getElementById('btn-mark-all-read')) {
                const markAllBtn = document.createElement('button');
                markAllBtn.id = 'btn-mark-all-read';
                markAllBtn.className = "text-xs text-green-400 hover:text-green-300 font-bold transition-colors";
                markAllBtn.innerHTML = '<i class="ri-check-double-line"></i> อ่านทั้งหมด';
                markAllBtn.onclick = (e) => {
                    e.stopPropagation();
                    markAllAsRead(notifications.map(n => n.notifId));
                    // Update UI ทันที
                    list.querySelectorAll('.notif-item').forEach(el => {
                        el.classList.add('opacity-50', 'grayscale', 'bg-gray-900/50');
                        el.classList.remove('hover:bg-gray-700');
                        el.querySelector('.status-text').className = 'text-xs font-bold text-gray-500 status-text';
                    });
                    updateBadge(0);
                    markAllBtn.remove(); // ลบปุ่มทิ้งเมื่อกดแล้ว
                };
                headerContainer.appendChild(markAllBtn);
            }

            const currentPath = window.location.pathname;
            const prefix = currentPath.includes('/pages/') ? '' : 'pages/';
            
            let html = '';
            notifications.forEach(n => {
                const readStyle = n.isRead ? 'opacity-50 grayscale bg-gray-900/50' : 'hover:bg-gray-700 bg-transparent';
                const textStyle = n.isRead ? 'text-gray-500' : 'text-green-400';
                
                html += `
                    <a href="${prefix}player.html?id=${n.id}" 
                       data-nid="${n.notifId}"
                       class="notif-item block p-3 border-b border-gray-700 last:border-0 flex gap-3 items-center transition-all ${readStyle}">
                        <div class="relative flex-shrink-0">
                            <img src="${n.thumbnail}" class="w-12 h-16 object-cover rounded shadow-md bg-gray-700" onerror="this.src='https://placehold.co/40x60'">
                            ${!n.isRead ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>' : ''}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex justify-between items-start">
                                <p class="text-xs font-bold ${textStyle} status-text mb-0.5">ตอนที่ ${n.ep}</p>
                                ${!n.isRead ? '<span class="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded">NEW</span>' : ''}
                            </div>
                            <p class="text-sm text-gray-200 truncate leading-tight">${n.title}</p>
                            <p class="text-[10px] text-gray-500 mt-1">คลิกเพื่อดูต่อ</p>
                        </div>
                    </a>
                `;
            });
            list.innerHTML = html;

            // Event Listener รายตัว
            list.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', function() {
                    const nid = this.getAttribute('data-nid');
                    if (nid) markAsRead(nid);
                });
            });

        } else {
            updateBadge(0);
            renderEmptyState(list);
        }

        // Dropdown Logic
        btn.onclick = (e) => { 
            e.stopPropagation(); 
            dropdown.classList.toggle('hidden'); 
        };
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) dropdown.classList.add('hidden');
        });

    } catch (e) { 
        console.error("Notification Error:", e);
        list.innerHTML = '<p class="text-center text-red-400 text-xs p-4">เกิดข้อผิดพลาดในการโหลด</p>';
    }

    // Helper Functions ภายใน Scope
    function updateBadge(count) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
            // Animation เด้งดึ๋งเมื่อมีแจ้งเตือนใหม่
            badge.classList.add('animate-bounce');
            setTimeout(() => badge.classList.remove('animate-bounce'), 1000);
        } else {
            badge.classList.add('hidden');
        }
    }
}

function renderEmptyState(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-6 text-gray-500 opacity-70">
            <i class="ri-notification-off-line text-4xl mb-2"></i>
            <p class="text-xs">ไม่มีการแจ้งเตือนใหม่</p>
        </div>
    `;
}

function getReadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_READ);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function markAsRead(notifId) {
    let reads = getReadState();
    if (!reads.includes(notifId)) {
        reads.push(notifId);
        if (reads.length > 200) reads.shift(); // เพิ่มขนาด storage นิดหน่อย
        localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(reads));
    }
}

function markAllAsRead(allIds) {
    // รวม ID เก่าและใหม่ ตัดตัวซ้ำ
    let reads = getReadState();
    const newSet = new Set([...reads, ...allIds]);
    const finalReads = Array.from(newSet).slice(-200); // เก็บแค่ 200 ตัวล่าสุด
    localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(finalReads));
}
