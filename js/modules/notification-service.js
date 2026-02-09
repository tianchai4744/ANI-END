// js/modules/notification-service.js
import { collection, getDocs, query, limit, doc, getDoc } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

const STORAGE_KEY_READ = 'ani_notif_read_ids';

// --- 🧠 SERVICE LAYER (สมอง: จัดการข้อมูล) ---
const NotificationService = {
    getReadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_READ);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    },

    saveReadState(reads) {
        localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(reads));
    },

    markAsRead(notifId) {
        let reads = this.getReadState();
        if (!reads.includes(notifId)) {
            reads.push(notifId);
            if (reads.length > 200) reads.shift();
            this.saveReadState(reads);
        }
    },

    markAllAsRead(allIds) {
        let reads = this.getReadState();
        const newSet = new Set([...reads, ...allIds]);
        const finalReads = Array.from(newSet).slice(-200);
        this.saveReadState(finalReads);
    },

    async fetchNotifications(userId) {
        // 1. ดึง Bookmarks
        const bookmarksRef = collection(db, `artifacts/${appId}/users/${userId}/bookmarks`);
        const bookmarksSnap = await getDocs(query(bookmarksRef, limit(50)));
        if (bookmarksSnap.empty) return { notifications: [], unreadCount: 0 };

        // 2. ดึง History
        const historyRef = collection(db, `artifacts/${appId}/users/${userId}/viewHistory`);
        const historySnap = await getDocs(query(historyRef));
        const historyMap = new Map();
        historySnap.forEach(doc => historyMap.set(doc.data().showId, doc.data().lastWatchedEpisodeNumber || 0));

        // 3. เปรียบเทียบ
        const readNotifications = this.getReadState();
        let unreadIds = [];

        const promises = bookmarksSnap.docs.map(async (docSnap) => {
            const showId = docSnap.id;
            // Optimization: สามารถเพิ่ม Cache ตรงนี้ได้ในอนาคต
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
                    timestamp: showData.lastUpdated?.toMillis() || Date.now()
                };
            }
            return null;
        });

        const results = await Promise.all(promises);
        const notifications = results.filter(n => n !== null);
        
        // เรียงลำดับ: ยังไม่อ่านขึ้นก่อน
        notifications.sort((a, b) => (a.isRead === b.isRead) ? 0 : a.isRead ? 1 : -1);

        return { notifications, unreadCount: unreadIds.length, unreadIds };
    }
};

// --- 🎨 UI LAYER (หน้าตา: แสดงผล) ---
const NotificationUI = {
    elements: {},

    init() {
        this.elements = {
            btn: document.getElementById('btn-notification'),
            badge: document.getElementById('notif-badge'),
            list: document.getElementById('notification-list'),
            dropdown: document.getElementById('notification-dropdown'),
            headerContainer: document.getElementById('notification-dropdown')?.querySelector('.border-b')
        };
    },

    renderLoading() {
        if (this.elements.list) {
            this.elements.list.innerHTML = `
                <div class="flex justify-center items-center py-8 text-gray-500">
                    <i class="ri-loader-4-line animate-spin text-2xl"></i>
                </div>`;
        }
    },

    renderEmpty() {
        if (this.elements.list) {
            this.elements.list.innerHTML = `
                <div class="flex flex-col items-center justify-center p-6 text-gray-500 opacity-70">
                    <i class="ri-notification-off-line text-4xl mb-2"></i>
                    <p class="text-xs">ไม่มีการแจ้งเตือนใหม่</p>
                </div>`;
        }
    },

    renderError() {
        if (this.elements.list) {
            this.elements.list.innerHTML = '<p class="text-center text-red-400 text-xs p-4">เกิดข้อผิดพลาดในการโหลด</p>';
        }
    },

    updateBadge(count) {
        if (!this.elements.badge) return;
        if (count > 0) {
            this.elements.badge.textContent = count > 99 ? '99+' : count;
            this.elements.badge.classList.remove('hidden');
            this.elements.badge.classList.add('animate-bounce');
            setTimeout(() => this.elements.badge.classList.remove('animate-bounce'), 1000);
        } else {
            this.elements.badge.classList.add('hidden');
        }
    },

    renderList(notifications, onMarkRead) {
        if (!this.elements.list) return;
        
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
                </a>`;
        });
        this.elements.list.innerHTML = html;

        // Bind Click Event for Tracking
        this.elements.list.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', function() {
                const nid = this.getAttribute('data-nid');
                if (nid) onMarkRead(nid);
            });
        });
    },

    renderMarkAllButton(show, onMarkAll) {
        if (!this.elements.headerContainer) return;
        const existingBtn = document.getElementById('btn-mark-all-read');
        
        if (show && !existingBtn) {
            const markAllBtn = document.createElement('button');
            markAllBtn.id = 'btn-mark-all-read';
            markAllBtn.className = "text-xs text-green-400 hover:text-green-300 font-bold transition-colors";
            markAllBtn.innerHTML = '<i class="ri-check-double-line"></i> อ่านทั้งหมด';
            markAllBtn.onclick = (e) => {
                e.stopPropagation();
                onMarkAll();
                markAllBtn.remove();
            };
            this.elements.headerContainer.appendChild(markAllBtn);
        } else if (!show && existingBtn) {
            existingBtn.remove();
        }
    },

    markAllItemsAsRead() {
        if (!this.elements.list) return;
        this.elements.list.querySelectorAll('.notif-item').forEach(el => {
            el.classList.add('opacity-50', 'grayscale', 'bg-gray-900/50');
            el.classList.remove('hover:bg-gray-700');
            el.querySelector('.status-text').className = 'text-xs font-bold text-gray-500 status-text';
        });
    }
};

// --- 🎮 CONTROLLER (ตัวคุมเกม) ---
export async function initNotificationSystem(userId) {
    NotificationUI.init();
    if (!NotificationUI.elements.btn) return;

    NotificationUI.renderLoading();

    try {
        const { notifications, unreadCount, unreadIds } = await NotificationService.fetchNotifications(userId);

        if (notifications.length > 0) {
            NotificationUI.updateBadge(unreadCount);
            
            NotificationUI.renderMarkAllButton(unreadCount > 0, () => {
                NotificationService.markAllAsRead(unreadIds);
                NotificationUI.markAllItemsAsRead();
                NotificationUI.updateBadge(0);
            });

            NotificationUI.renderList(notifications, (nid) => {
                NotificationService.markAsRead(nid);
            });
        } else {
            NotificationUI.updateBadge(0);
            NotificationUI.renderEmpty();
        }

        // Dropdown Logic
        const { btn, dropdown } = NotificationUI.elements;
        btn.onclick = (e) => { 
            e.stopPropagation(); 
            dropdown.classList.toggle('hidden'); 
        };
        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

    } catch (e) {
        console.error("Notif Error:", e);
        NotificationUI.renderError();
    }
}
