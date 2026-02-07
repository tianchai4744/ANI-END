// utils.js
// ไฟล์นี้รวมฟังก์ชันตัวช่วยต่างๆ ไว้ที่เดียว

// ฟังก์ชันแก้ปัญหาสระลอย และจัดรูปแบบภาษาไทยให้ค้นหาได้แม่นยำ
export function normalizeThai(text) {
    if (typeof text !== 'string') return text || '';
    let normalized = text.normalize('NFC');
    normalized = normalized.replace(/\u0E4D\u0E32/g, '\u0E33');
    normalized = normalized.replace(/\u0E32\u0E4D/g, '\u0E33');
    return normalized;
}

// ฟังก์ชันสำหรับสร้าง Keywords สำหรับ Firestore
export function generateKeywords(title) {
    if (!title) return [];
    const keywords = new Set();
    const str = normalizeThai(title).toLowerCase().trim();
    if (!str) return [];

    keywords.add(str);
    const words = str.split(/\s+/); 

    words.forEach(word => {
        if (!word) return;
        keywords.add(word);
        let current = '';
        const limit = Math.min(word.length, 20); 
        for (let i = 0; i < limit; i++) {
            current += word[i];
            keywords.add(current);
        }
    });
    return [...keywords];
}

// ฟังก์ชันแปลงเวลาจาก Firebase เป็นรูปแบบไทย
export function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return '-';
    }
}

// ฟังก์ชันหน่วงเวลา (Debounce)
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// ฟังก์ชันสร้างคำค้นหา
export function generateSearchTerms(text) {
    if (!text) return [];
    const str = normalizeThai(text).toLowerCase().trim();
    if (!str) return [];
    return str.split(/\s+/).filter(w => w.length > 0);
}

// [UPDATED] ฟังก์ชันแปลง URL เป็น HTML Embed (แก้ Warning allowfullscreen)
export function generateVideoEmbed(inputUrl) {
    if (!inputUrl) return "";
    let url = inputUrl.trim();

    // 1. กรณีเป็น Iframe Code อยู่แล้ว
    if (url.startsWith('<iframe')) {
        return url; 
    }

    // 2. ตรวจสอบ YouTube
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);
    
    if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        // ✅ แก้ไข: ลบ allowfullscreen และรวมไว้ใน allow="..." แทน
        return `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0" 
                width="100%" height="100%" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"></iframe>`;
    }

    // 3. ตรวจสอบ Dailymotion
    const dmRegex = /dailymotion\.com\/video\/([a-zA-Z0-9]+)/i;
    const dmMatch = url.match(dmRegex);
    
    if (dmMatch && dmMatch[1]) {
        const videoId = dmMatch[1];
        // ✅ แก้ไข: ลบ allowfullscreen และรวมไว้ใน allow="..." แทน
        return `<iframe src="https://www.dailymotion.com/embed/video/${videoId}?autoplay=1" 
                width="100%" height="100%" 
                frameborder="0" 
                allow="autoplay; fullscreen"></iframe>`;
    }

    // 4. กรณีอื่นๆ
    // ✅ แก้ไข: ใช้ allow="autoplay; fullscreen" แทน attribute แยก
    return `<iframe src="${url}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen"></iframe>`;
}
