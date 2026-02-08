import { db, appId } from "../config/db-config.js";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import MiniSearch from 'minisearch';

// 🚀 เปลี่ยนชื่อตัวแปรนี้เพื่อบังคับให้เครื่องโหลดข้อมูลชุดใหม่ที่มีรูปภาพ
const CACHE_KEY = 'ani_search_index_v3_images_fixed'; 
const CACHE_DURATION = 1000 * 60 * 60 * 24; // เก็บไว้ 24 ชม.

let miniSearch = null;

// ตั้งค่า Search Engine
function initMiniSearch(data) {
    // กำหนดฟิลด์ที่จะใช้ค้นหา และฟิลด์ที่จะเก็บไว้แสดงผล
    miniSearch = new MiniSearch({
        idField: 'id',
        fields: ['title', 'altTitle', 'tags', 'studio'], // ค้นหาจากอะไรบ้าง
        storeFields: ['id', 'title', 'posterUrl', 'releaseYear', 'rating', 'type', 'tags'], // ข้อมูลที่จะส่งกลับไปแสดงผล
        searchOptions: {
            boost: { title: 2, altTitle: 1.5 },
            fuzzy: 0.2,
            prefix: true
        }
    });

    miniSearch.addAll(data);
    console.log(`🚀 Search Engine Ready! (Loaded ${data.length} items)`);
}

export async function loadSearchIndex() {
    try {
        // 1. ลองดึงจาก Cache ในเครื่องก่อน
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                // เช็คว่าข้อมูลเก่าเกินไปหรือยัง
                if (Date.now() - timestamp < CACHE_DURATION) {
                    console.log(`🔍 Loaded ${data.length} items from Local Cache (Fast Mode)`);
                    initMiniSearch(data);
                    return;
                }
            } catch (e) {
                localStorage.removeItem(CACHE_KEY);
            }
        }

        // 2. ถ้าไม่มี Cache หรือเก่าแล้ว ให้ดึงจาก Server (Firebase)
        console.log("☁️ Fetching fresh search index from Firestore...");
        
        // ดึงข้อมูลล่าสุด (สามารถเพิ่ม limit(1000) หากเว็บเริ่มช้า)
        const q = query(
            collection(db, `artifacts/${appId}/public/data/shows`), 
            orderBy('updatedAt', 'desc')
        ); 
        
        const snapshot = await getDocs(q);
        
        // แปลงข้อมูลให้อยู่ในรูปแบบที่เล็กลงเพื่อความเร็ว
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            // 🛠️ แก้ไข: เช็คหลายฟิลด์เผื่อ Database ใช้ชื่อต่างกัน (cover, image, posterUrl)
            const img = d.posterUrl || d.image || d.cover || d.coverImage || '';
            
            return {
                id: doc.id,
                title: d.title || 'Unknown Title',
                altTitle: d.altTitle || '',
                tags: Array.isArray(d.tags) ? d.tags.join(' ') : '',
                studio: d.studio || '',
                posterUrl: img, // เก็บค่ารูปลงตัวแปรนี้
                releaseYear: d.releaseYear || '',
                rating: d.averageRating || 0,
                type: d.type || 'TV'
            };
        });

        // 3. บันทึกลงเครื่อง (Cache)
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ 
                timestamp: Date.now(), 
                data: data 
            }));
        } catch (e) {
            console.warn("Storage full, skipping cache save");
        }

        initMiniSearch(data);

    } catch (error) {
        console.error("❌ Failed to load search index:", error);
    }
}

export function searchAnime(queryText) {
    if (!miniSearch) return [];
    // คืนค่าผลการค้นหา
    return miniSearch.search(queryText);
}
