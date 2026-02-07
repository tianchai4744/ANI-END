// ✅ แก้ไข: เปลี่ยนจาก CDN เป็น npm package
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

let isBookmarked = false;
let btnBookmark = null;

export async function initBookmarkSystem(user, showData) {
    btnBookmark = document.getElementById('btn-bookmark');
    if (!btnBookmark) return;

    // Reset UI
    updateUI(false, user);

    // Click Handler
    btnBookmark.onclick = async () => {
        if (!user) {
            if (confirm('คุณต้องเข้าสู่ระบบเพื่อบันทึกรายการโปรด\nต้องการเข้าสู่ระบบหรือไม่?')) {
                window.triggerLogin();
            }
            return;
        }
        await toggleBookmark(user, showData);
    };

    // Check Status if logged in
    if (user && showData) {
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/bookmarks`, showData.id);
            const snap = await getDoc(docRef);
            isBookmarked = snap.exists();
            updateUI(isBookmarked, user);
        } catch (e) { console.error(e); }
    }
}

function updateUI(status, user) {
    if (!user) {
        btnBookmark.innerHTML = '<i class="ri-heart-add-line"></i> เพิ่มรายการโปรด (Login)';
        btnBookmark.className = "flex items-center gap-2 px-4 py-2 rounded-full border border-gray-600 text-sm text-gray-400 hover:bg-gray-800 transition-colors cursor-pointer";
        return;
    }

    if (status) {
        btnBookmark.innerHTML = '<i class="ri-heart-fill text-red-500"></i> รายการโปรด';
        btnBookmark.className = "flex items-center gap-2 px-4 py-2 rounded-full border border-red-500 text-sm text-red-400 hover:bg-gray-800 transition-colors cursor-pointer";
    } else {
        btnBookmark.innerHTML = '<i class="ri-heart-line"></i> เพิ่มรายการโปรด';
        btnBookmark.className = "flex items-center gap-2 px-4 py-2 rounded-full border border-gray-600 text-sm hover:bg-gray-800 transition-colors cursor-pointer";
    }
}

async function toggleBookmark(user, showData) {
    btnBookmark.disabled = true;
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/bookmarks`, showData.id);
        
        if (isBookmarked) {
            await deleteDoc(docRef);
            isBookmarked = false;
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
            isBookmarked = true;
        }
        updateUI(isBookmarked, user);
    } catch (e) { 
        console.error(e); 
        alert('เกิดข้อผิดพลาดในการบันทึก'); 
    } finally { 
        btnBookmark.disabled = false; 
    }
}
