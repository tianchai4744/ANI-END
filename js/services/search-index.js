import { db, appId } from "../config/db-config.js";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// ใช้ v2 เพื่อโหลดข้อมูลใหม่ที่มีรูปภาพ
const CACHE_KEY = 'ani_search_index_v2'; 
const CACHE_DURATION = 1000 * 60 * 60 * 24; 

let miniSearch = null;

function initMiniSearch(data) {
    if (typeof MiniSearch === 'undefined') {
        console.error("❌ MiniSearch library not loaded!");
        return;
    }
    miniSearch = new MiniSearch({
        fields: ['title', 'altTitle', 'tags', 'studio'],
        storeFields: ['id', 'title', 'posterUrl', 'releaseYear', 'rating', 'type', 'tags'],
        searchOptions: {
            boost: { title: 2, altTitle: 1.5 },
            fuzzy: 0.2,
            prefix: true
        }
    });
    miniSearch.addAll(data);
    console.log("🚀 Search Engine Ready! (Loaded " + data.length + " items)");
}

export async function loadSearchIndex() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    console.log(`🔍 Loaded ${data.length} items from Search Cache (v2)`);
                    initMiniSearch(data);
                    return;
                }
            } catch (e) { localStorage.removeItem(CACHE_KEY); }
        }

        console.log("☁️ Fetching fresh search index from Firestore...");
        const q = query(collection(db, `artifacts/${appId}/public/data/shows`), orderBy('updatedAt', 'desc')); 
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                title: d.title || '',
                altTitle: d.altTitle || '',
                tags: (d.tags || []).join(' '),
                studio: d.studio || '',
                posterUrl: d.posterUrl || 'https://placehold.co/40x60', // มี Default ป้องกันรูปเสีย
                releaseYear: d.releaseYear || '',
                rating: d.averageRating || 0,
                type: d.type || 'TV'
            };
        });

        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: data }));
        initMiniSearch(data);

    } catch (error) {
        console.error("Failed to load search index:", error);
    }
}

export function searchAnime(queryText) {
    if (!miniSearch) return [];
    return miniSearch.search(queryText);
}
