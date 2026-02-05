// utils.js
// ไฟล์นี้รวมฟังก์ชันตัวช่วยต่างๆ ไว้ที่เดียว

// ฟังก์ชันแก้ปัญหาสระลอย และจัดรูปแบบภาษาไทยให้ค้นหาได้แม่นยำ
export function normalizeThai(text) {
    if (typeof text !== 'string') return text || '';
    
    // 1. จัดระเบียบสระวรรณยุกต์ (Canonical Composition)
    let normalized = text.normalize('NFC');
    
    // 2. แก้ปัญหาสระอำ (Sara Am)
    // กรณีที่ 1: นิคหิต (\u0E4D) + สระอา (\u0E32) -> ให้รวมเป็น สระอำ (\u0E33)
    normalized = normalized.replace(/\u0E4D\u0E32/g, '\u0E33');
    
    // กรณีที่ 2 (พิมพ์ผิด): สระอา (\u0E32) + นิคหิต (\u0E4D) -> ให้แก้เป็น สระอำ (\u0E33)
    normalized = normalized.replace(/\u0E32\u0E4D/g, '\u0E33');

    return normalized;
}

// ฟังก์ชันสำหรับสร้าง Keywords สำหรับ Firestore (IMPROVED!)
// ใช้ใน Admin.js ตอนบันทึกข้อมูล เพื่อให้ระบบค้นหาทำงานได้เหมือน "Partial Match"
export function generateKeywords(title) {
    if (!title) return [];
    
    // ใช้ Set เพื่อป้องกันคำซ้ำอัตโนมัติ (Deduplication)
    const keywords = new Set();
    
    // เรียกใช้ normalizeThai เพื่อแก้สระอำก่อน และแปลงเป็นตัวเล็ก
    const str = normalizeThai(title).toLowerCase().trim();
    if (!str) return [];

    // 1. เก็บคำเต็มทั้งประโยค (เผื่อคนค้นหาด้วยชื่อเต็มเป๊ะๆ)
    keywords.add(str);

    // 2. แยกคำด้วยช่องว่าง
    // ใช้ Regex \s+ เพื่อรองรับทั้ง space, tab, newline
    const words = str.split(/\s+/); 

    // 3. สร้าง Keywords และ Prefixes สำหรับ **ทุกคำ**
    words.forEach(word => {
        if (!word) return;

        // 3.1 เก็บคำนั้นๆ
        keywords.add(word);

        // 3.2 สร้าง Prefix (substring) สำหรับคำนั้นๆ
        // เช่น "Titan" -> "t", "ti", "tit", "tita", "titan"
        // ช่วยให้พิมพ์แค่บางส่วนของคำก็ค้นหาเจอ
        let current = '';
        // จำกัดความยาว Prefix เพื่อไม่ให้เปลืองพื้นที่ Array ใน Firestore มากเกินไป
        // (เช่น ชื่อยาวๆ เราอาจจะไม่ต้องเก็บทุกตัวอักษร เก็บแค่ 15-20 ตัวแรกก็พอให้ค้นหาเจอแล้ว)
        const limit = Math.min(word.length, 20); 
        
        for (let i = 0; i < limit; i++) {
            current += word[i];
            keywords.add(current);
        }
    });

    // คืนค่ากลับเป็น Array
    return [...keywords];
}

// ฟังก์ชันแปลงเวลาจาก Firebase เป็นรูปแบบไทย
export function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    try {
        // รองรับทั้ง Firestore Timestamp และ Date object ปกติ
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return '-';
    }
}

// ฟังก์ชันหน่วงเวลา (Debounce) - ลดการเรียกฟังก์ชันซ้ำๆ เช่น ตอนพิมพ์ค้นหา
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// ฟังก์ชันสร้างคำค้นหา (สำหรับ Search Logic ในฝั่ง Frontend)
export function generateSearchTerms(text) {
    if (!text) return [];
    // Normalize และตัดช่องว่าง
    const str = normalizeThai(text).toLowerCase().trim();
    if (!str) return [];
    
    // แยกคำค้นหาด้วยช่องว่าง เพื่อให้รองรับการค้นหาหลายคำ (เช่น "One Piece")
    // แต่ละคำจะถูกนำไปค้นใน Array "keywords" ของ Firestore
    return str.split(/\s+/).filter(w => w.length > 0);
}

// [NEW] ฟังก์ชันแปลง URL เป็น HTML Embed พร้อม Autoplay (ใช้ที่หน้า Player)
export function generateVideoEmbed(inputUrl) {
    if (!inputUrl) return "";
    let url = inputUrl.trim();

    // 1. กรณีเป็น Iframe Code อยู่แล้ว (Pass-through)
    if (url.startsWith('<iframe')) {
        return url; // ปล่อยผ่านตามที่ Admin กรอกมา
    }

    // 2. ตรวจสอบ YouTube (รองรับทั้ง youtube.com และ youtu.be)
    // Regex จับ Video ID
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);
    
    if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        // สร้าง Embed URL มาตรฐาน พร้อม Autoplay, ปิด Related Video (rel=0)
        return `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0" 
                width="100%" height="100%" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
                allowfullscreen></iframe>`;
    }

    // 3. ตรวจสอบ Dailymotion
    const dmRegex = /dailymotion\.com\/video\/([a-zA-Z0-9]+)/i;
    const dmMatch = url.match(dmRegex);
    
    if (dmMatch && dmMatch[1]) {
        const videoId = dmMatch[1];
        return `<iframe src="https://www.dailymotion.com/embed/video/${videoId}?autoplay=1" 
                width="100%" height="100%" 
                frameborder="0" 
                allow="autoplay; fullscreen" 
                allowfullscreen></iframe>`;
    }

    // 4. กรณีอื่นๆ (เช่น MP4 Direct Link) หรือ Link ทั่วไป
    // พยายามสร้าง Iframe ครอบ
    return `<iframe src="${url}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay"></iframe>`;
}
