// js/modules/bookmark-manager.js
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

// --- 🧠 SERVICE LAYER (สมอง: จัดการข้อมูล) ---
const BookmarkService = {
    async checkStatus(userId, showId) {
        if (!userId || !showId) return false;
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/bookmarks`, showId);
            const snap = await getDoc(docRef);
            return snap.exists();
        } catch (e) {
            console.error("Bookmark Check Error:", e);
            return false;
        }
    },

    async toggle(userId, showData, isCurrentlyBookmarked) {
        if (!userId || !showData) throw new Error("Missing User or Show Data");
        
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/bookmarks`, showData.id);
        
        if (isCurrentlyBookmarked) {
            await deleteDoc(docRef);
            return false; // New Status
        } else {
            const data = {
                title: showData.title,
                thumbnailUrl: showData.thumbnailUrl || '',
                tags: showData.tags || [],
                isCompleted: showData.isCompleted || false,
                latestEpisodeNumber: showData.latestEpisodeNumber || 0,
                savedAt: serverTimestamp()
            };
            await setDoc(docRef, data);
            return true; // New Status
        }
    }
};

// --- 🎨 UI LAYER (หน้าตา: จัดการปุ่ม) ---
const BookmarkUI = {
    btn: null,

    init() {
        this.btn = document.getElementById('btn-bookmark');
    },

    updateState(isBookmarked, isLoggedIn) {
        if (!this.btn) return;

        if (!isLoggedIn) {
            this._renderButton('<i class="ri-heart-add-line"></i> เพิ่มรายการโปรด (Login)', 'gray');
            return;
        }

        if (isBookmarked) {
            this._renderButton('<i class="ri-heart-fill text-red-500"></i> รายการโปรด', 'red');
        } else {
            this._renderButton('<i class="ri-heart-line"></i> เพิ่มรายการโปรด', 'gray');
        }
    },

    toggleLoading(isLoading) {
        if (!this.btn) return;
        this.btn.disabled = isLoading;
        if (isLoading) this.btn.classList.add('opacity-50', 'cursor-not-allowed');
        else this.btn.classList.remove('opacity-50', 'cursor-not-allowed');
    },

    _renderButton(html, colorTheme) {
        this.btn.innerHTML = html;
        if (colorTheme === 'red') {
            this.btn.className = "flex items-center gap-2 px-4 py-2 rounded-full border border-red-500 text-sm text-red-400 hover:bg-gray-800 transition-colors cursor-pointer select-none";
        } else {
            this.btn.className = "flex items-center gap-2 px-4 py-2 rounded-full border border-gray-600 text-sm text-gray-400 hover:bg-gray-800 transition-colors cursor-pointer select-none";
        }
    }
};

// --- 🎮 CONTROLLER (ตัวเชื่อม) ---
let isBookmarked = false;

export async function initBookmarkSystem(user, showData) {
    BookmarkUI.init();
    if (!BookmarkUI.btn) return;

    // 1. Initial UI State
    BookmarkUI.updateState(false, !!user);

    // 2. Check Real Status (if logged in)
    if (user && showData) {
        isBookmarked = await BookmarkService.checkStatus(user.uid, showData.id);
        BookmarkUI.updateState(isBookmarked, true);
    }

    // 3. Bind Event
    BookmarkUI.btn.onclick = async () => {
        if (!user) {
            if (confirm('คุณต้องเข้าสู่ระบบเพื่อบันทึกรายการโปรด\nต้องการเข้าสู่ระบบหรือไม่?')) {
                window.triggerLogin();
            }
            return;
        }

        BookmarkUI.toggleLoading(true);
        try {
            isBookmarked = await BookmarkService.toggle(user.uid, showData, isBookmarked);
            BookmarkUI.updateState(isBookmarked, true);
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            BookmarkUI.toggleLoading(false);
        }
    };
}
