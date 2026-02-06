import { doc, setDoc, getDoc, runTransaction, serverTimestamp, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, appId } from "../config/db-config.js";

// โหลดประวัติการดู (ใช้สำหรับหาตอนที่ดูล่าสุดเพื่อ Resume)
export async function loadWatchHistory(userId) {
    if (!userId) return [];
    try {
        const historyQuery = query(collection(db, `artifacts/${appId}/users/${userId}/viewHistory`), orderBy("watchedAt", "desc"), limit(50));
        const snapshot = await getDocs(historyQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("History load error:", error);
        return [];
    }
}

// นับยอดวิว (มี Cooldown 30 นาที กันปั๊มวิว)
export async function trackView(showId) {
    const cooldown = 30 * 60 * 1000;
    const storageKey = `last_view_${showId}`;
    const lastViewTime = localStorage.getItem(storageKey);
    const now = Date.now();

    if (lastViewTime && (now - parseInt(lastViewTime)) < cooldown) return;

    try {
        const showRef = doc(db, `artifacts/${appId}/public/data/shows`, showId);
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(showRef);
            if (!sfDoc.exists()) return;
            const newViews = (sfDoc.data().viewCount || 0) + 1;
            transaction.update(showRef, { viewCount: newViews });
        });
        localStorage.setItem(storageKey, now.toString());
    } catch (e) { console.warn("View count skipped:", e); }
}

// บันทึกประวัติการดูลง Firestore
export async function saveHistory(userId, showData, episode) {
    if (!userId || !showData || !episode) return;
    try {
        const historyRef = doc(db, `artifacts/${appId}/users/${userId}/viewHistory`, showData.id);
        const historyData = {
            showId: showData.id,
            showTitle: showData.title,
            showThumbnail: showData.thumbnailUrl || '',
            lastWatchedEpisodeId: episode.id,
            lastWatchedEpisodeTitle: episode.title,
            lastWatchedEpisodeNumber: episode.number,
            isCompleted: showData.isCompleted === true,
            latestEpisodeNumber: showData.latestEpisodeNumber || 0,
            watchedAt: serverTimestamp()
        };
        // ใช้ merge: true เพื่อไม่ให้ทับข้อมูลเก่า
        await setDoc(historyRef, historyData, { merge: true });
    } catch (error) { console.error("Save history error:", error); }
}
