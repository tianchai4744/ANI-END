import MiniSearch from 'minisearch';
import { db, appId } from '../config/db-config.js';
import { collection, getDocs } from "firebase/firestore";

// ตั้งค่า MiniSearch (เอาไว้ช่วยเรื่องพิมพ์ผิด และค้นหาแบบ Prefix)
let miniSearch = new MiniSearch({
    fields: ['title', 'alternativeTitles'], // ฟิลด์ที่จะค้นหา
    storeFields: ['id', 'title', 'posterUrl', 'type', 'releaseYear', 'rating', 'alternativeTitles'], // ฟิลด์ที่จะส่งกลับไปแสดงผล
    searchOptions: {
        boost: { title: 2 }, // ให้ความสำคัญกับชื่อเรื่องหลักมากกว่า
        fuzzy: 0.2,          // ยอมให้พิมพ์ผิดได้นิดหน่อย (เช่น Titan -> Titna)
        prefix: true         // ค้นหาจากคำขึ้นต้นได้
    }
});

// ตัวแปรเก็บข้อมูลดิบ (เอาไว้ใช้ค้นหาแบบเจาะจงกลางคำ)
let allAnimeRaw = []; 
let isLoaded = false;

export async function loadSearchIndex() {
    if (isLoaded) return;

    try {
        console.log("Starting to load search index...");
        const querySnapshot = await getDocs(collection(db, `artifacts/${appId}/public/data/shows`));
        
        const docs = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // เตรียมข้อมูลให้สะอาดที่สุด
            const item = {
                id: doc.id,
                title: data.title || "Unknown Title",
                posterUrl: data.posterUrl || data.thumbnailUrl || '', // รองรับทั้ง 2 ชื่อตัวแปร
                type: data.type || 'TV',
                releaseYear: data.releaseDate ? new Date(data.releaseDate).getFullYear() : '-',
                rating: data.rating || 0,
                // แปลง tags หรือ ชื่ออื่นให้เป็น string เดียวเพื่อการค้นหาที่ง่ายขึ้น
                alternativeTitles: (data.alternativeTitles || []).concat(data.tags || []).join(' ') 
            };
            docs.push(item);
        });

        // 1. ใส่เข้า MiniSearch
        miniSearch.addAll(docs);
        
        // 2. เก็บใส่ตัวแปรไว้ค้นหาแบบละเอียด (Substring)
        allAnimeRaw = docs;
        
        isLoaded = true;
        console.log(`Search Index Loaded: ${docs.length} items.`);

    } catch (error) {
        console.error("Critical Error loading search index:", error);
    }
}

// ฟังก์ชันค้นหาแบบ Hybrid (ฉลาดขึ้น 200%)
export function searchAnime(query) {
    if (!query || !isLoaded) return [];

    const cleanQuery = query.toLowerCase().trim();

    // ----------------------------------------------------
    // เทคนิคที่ 1: ใช้ MiniSearch (เก่งเรื่องพิมพ์ผิด, พิมพ์สลับที่)
    // ----------------------------------------------------
    const fuzzyResults = miniSearch.search(query);

    // ----------------------------------------------------
    // เทคนิคที่ 2: ใช้ .includes() (เก่งเรื่องหาคำกลางประโยค และภาษาไทย)
    // ----------------------------------------------------
    const substringResults = allAnimeRaw.filter(item => {
        const titleMatch = item.title.toLowerCase().includes(cleanQuery);
        const altMatch = item.alternativeTitles.toLowerCase().includes(cleanQuery);
        return titleMatch || altMatch;
    });

    // ----------------------------------------------------
    // รวมร่างผลลัพธ์ (Merge & Deduplicate)
    // ----------------------------------------------------
    const mergedMap = new Map();

    // เอาผลจาก MiniSearch ขึ้นก่อน (เพราะมักจะตรงกว่าในแง่ Ranking)
    fuzzyResults.forEach(item => mergedMap.set(item.id, item));

    // เอาผลจาก Substring มาเติม (เฉพาะอันที่ยังไม่มี)
    substringResults.forEach(item => {
        if (!mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
        }
    });

    // แปลงกลับเป็น Array
    return Array.from(mergedMap.values());
}
