import { db, appId } from "../config/db-config.js";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const CACHE_KEY = 'ani_search_index_v1';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // เก็บ Cache 24 ชั่วโมง (ประหยัด Read สุดๆ)

let miniSearch = null;

// ตั้งค่า Search Engine
function initMiniSearch(data) {
    miniSearch = new MiniSearch({
        fields: ['title', 'altTitle', 'tags', 'studio'], // ฟิลด์ที่จะค้นหา
        storeFields: ['id', 'title', 'posterUrl', 'releaseYear', 'rating', 'type'], // ฟิลด์ที่จะเอามาแสดงผล
        searchOptions: {
            boost: { title: 2, altTitle: 1.5 }, // ให้ความสำคัญกับชื่อเรื่องมากที่สุด
            fuzzy: 0.2, // ยอมให้พิมพ์ผิดได้นิดหน่อย (0.2 = ผิดได้ประมาณ 20%)
            prefix: true // พิมพ์แค่คำหน้าก็เจอ
        }
    });
    miniSearch.addAll(data);
}

// ฟังก์ชันโหลดข้อมูล (Smart Fetch)
export async function loadSearchIndex() {
    try {
        // 1. ลองดึงจาก LocalStorage ก่อน
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            // ถ้า Cache ยังไม่หมดอายุ (24 ชม.) ให้ใช้เลย
            if (Date.now() - timestamp < CACHE_DURATION) {
                console.log(`🔍 Loaded ${data.length} items from Search Cache`);
                initMiniSearch(data);
                return;
            }
        }

        // 2. ถ้าไม่มี Cache หรือหมดอายุ ให้โหลดใหม่จาก Firestore
        console.log("☁️ Fetching fresh search index from Firestore...");
        const q = query(collection(db, `artifacts/${appId}/public/data/shows`), orderBy('updatedAt', 'desc')); 
        // หมายเหตุ: ถ้าข้อมูลเยอะมาก (>2000 เรื่อง) อาจต้อง limit หรือใช้ Cloud Function สร้าง JSON ไฟล์แยก
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                title: d.title,
                altTitle: d.altTitle || '', // ชื่อภาษาอื่น
                tags: (d.tags || []).join(' '), // แปลง Tags เป็น String
                studio: d.studio || '',
                posterUrl: d.posterUrl,
                releaseYear: d.releaseYear,
                rating: d.averageRating,
                type: d.type
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
