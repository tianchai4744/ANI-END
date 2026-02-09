// js/modules/player-related.js
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";
import { createAnimeCard } from "./card.js";
import { observeImages } from "../utils/tools.js";

// 🧠 SERVICE
const RelatedService = {
    async fetchRelated(tags, currentId) {
        if (!tags || tags.length === 0) return [];
        const q = query(
            collection(db, `artifacts/${appId}/public/data/shows`), 
            where("tags", "array-contains-any", tags.slice(0, 5)), 
            limit(10)
        );
        const snapshot = await getDocs(q);
        const results = [];
        snapshot.forEach(doc => {
            if (doc.id !== currentId) results.push({ id: doc.id, ...doc.data() });
        });
        return results;
    }
};

// 🎨 UI
const RelatedUI = {
    render(shows, historyItems) {
        const container = document.getElementById('related-list-container');
        if (!container) return;

        if (shows.length === 0) {
            container.innerHTML = '<p class="text-gray-500 col-span-full text-center">ไม่มีอนิเมะที่เกี่ยวข้อง</p>';
            return;
        }

        let html = '';
        shows.forEach(show => {
            const history = historyItems.find(h => h.showId === show.id);
            html += createAnimeCard(show, null, history);
        });
        container.innerHTML = html;
        observeImages(container);
    }
};

// 🎮 CONTROLLER
export async function renderRelatedAnime(showData, historyItems) {
    try {
        const relatedShows = await RelatedService.fetchRelated(showData.tags, showData.id);
        RelatedUI.render(relatedShows, historyItems);
    } catch (err) {
        console.warn("Related fetch error", err);
    }
}
