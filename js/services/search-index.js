import { db, appId } from "../config/db-config.js";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

// ✅ เปลี่ยนเป็น v2 เพื่อล้างข้อมูลเก่าที่ไม่มีรูปภาพทิ้ง แล้วโหลดใหม่
const CACHE_KEY = 'ani_search_index_v2'; 
const CACHE_DURATION = 1000 * 60 * 60 * 24; // เก็บ Cache 24 ชั่วโมง

let miniSearch = null;

// ตั้งค่า Search Engine
function initMiniSearch(data) {
    // ตรวจสอบว่ามี Library หรือไม่
    if (typeof MiniSearch === 'undefined') {
        console.error("❌ MiniSearch library not loaded! Please add script tag in index.html");
        return;
    }

    miniSearch = new MiniSearch({
        fields: ['title', 'altTitle', 'tags', 'studio'], // ฟิลด์สำหรับค้นหา
        storeFields: ['id', 'title', 'posterUrl', 'releaseYear', 'rating', 'type', 'tags'], // ฟิลด์สำหรับแสดงผล (เพิ่ม posterUrl แล้ว)
        searchOptions: {
            boost: { title: 2, altTitle: 1.5 }, // ให้ความสำคัญกับชื่อเรื่อง
            fuzzy: 0.2, // พิมพ์ผิดได้นิดหน่อย
            prefix: true
        }
    });
    miniSearch.addAll(data);
    console.log("🚀 Search Engine Ready! (Loaded " + data.length + " items)");
}

// ฟังก์ชันโหลดข้อมูล (Smart Fetch)
export async function loadSearchIndex() {
    try {
        // 1. ลองดึงจาก LocalStorage ก่อน
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                // ถ้า Cache ยังไม่หมดอายุ (24 ชม.) ให้ใช้เลย
                if (Date.now() - timestamp < CACHE_DURATION) {
                    console.log(`🔍 Loaded ${data.length} items from Search Cache (v2)`);
                    initMiniSearch(data);
                    return;
                }
            } catch (e) {
                console.warn("Cache corrupted, reloading...");
                localStorage.removeItem(CACHE_KEY);
            }
        }

        // 2. ถ้าไม่มี Cache หรือหมดอายุ ให้โหลดใหม่จาก Firestore
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
                posterUrl: d.posterUrl || 'https://placehold.co/40x60', // ใส่รูป Default กันไว้
                releaseYear: d.releaseYear || '',
                rating: d.averageRating || 0,
                type: d.type || 'TV'
            };
        });

        // 3. บันทึกลง Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));

        initMiniSearch(data);

    } catch (error) {
        console.error("Failed to load search index:", error);
    }
}

// ฟังก์ชันค้นหาที่เรียกใช้จากภายนอก
export function searchAnime(queryText) {
    if (!miniSearch) return [];
    return miniSearch.search(queryText);
}
