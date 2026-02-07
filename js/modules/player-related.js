// ✅ แก้ไข: เปลี่ยนจาก CDN เป็น npm package
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";
import { createAnimeCard } from "./card.js";

export async function renderRelatedAnime(showData, historyItems) {
    const container = document.getElementById('related-list-container');
    if (!container || !showData.tags || showData.tags.length === 0) return;

    try {
        const q = query(
            collection(db, `artifacts/${appId}/public/data/shows`), 
            where("tags", "array-contains-any", showData.tags.slice(0, 5)), 
            limit(10)
        );
        
        const snapshot = await getDocs(q);
        let html = '';
        
        snapshot.forEach((doc) => {
            if (doc.id !== showData.id) {
                const item = { id: doc.id, ...doc.data() };
                const history = historyItems.find(h => h.showId === item.id);
                html += createAnimeCard(item, null, history);
            }
        });

        container.innerHTML = html || '<p class="text-gray-500 col-span-full text-center">ไม่มีอนิเมะที่เกี่ยวข้อง</p>';
        
    } catch (err) {
        console.warn("Related fetch error", err);
    }
}
