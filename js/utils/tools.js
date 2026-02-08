// --- 1. General Utilities ---

// ✅ Debounce: ฟังก์ชันหน่วงเวลา (สำคัญมากสำหรับช่องค้นหา)
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// ✅ Shuffle Array: สุ่มลำดับข้อมูล (ใช้ใน Random Button)
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- 2. Image Loading System (ฉบับแก้ไขบั๊ก Skeleton) ---

// Observer สำหรับจับตาดูรูปภาพ
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            
            if (src) {
                // เทคนิค: โหลดรูปใน Memory ก่อน
                const tempImage = new Image();
                tempImage.src = src;
                
                tempImage.onload = () => {
                    img.src = src;
                    
                    // Animation: แสดงรูป
                    img.classList.remove('opacity-0', 'scale-95'); 
                    img.classList.add('opacity-100', 'scale-100');
                    
                    // Stop Skeleton: หยุดกระพริบที่ตัว Parent
                    const wrapper = img.closest('.image-wrapper');
                    if (wrapper) wrapper.classList.remove('animate-pulse');
                    
                    img.removeAttribute('data-src');
                };
                
                tempImage.onerror = () => {
                   // กรณีรูปเสีย ใช้รูป Placeholder
                   img.src = 'https://placehold.co/400x600/333/fff?text=No+Img';
                   img.classList.remove('opacity-0');
                   
                   const wrapper = img.closest('.image-wrapper');
                   if (wrapper) wrapper.classList.remove('animate-pulse');
                };
            }
            // เลิกจับตาดูเมื่อโหลดเสร็จ
            observer.unobserve(img);
        }
    });
}, {
    rootMargin: '100px', // โหลดล่วงหน้าเมื่อใกล้ถึง 100px
    threshold: 0.01
});

// ฟังก์ชันเรียกใช้ Observer (Export ออกไปให้ไฟล์อื่นใช้)
export function observeImages(container = document) {
    // หา img ที่มี data-src และยังไม่ถูก observe
    const images = container.querySelectorAll('img[data-src]:not(.observed)');
    images.forEach(img => {
        img.classList.add('observed'); 
        imageObserver.observe(img);
    });
}

// --- 3. Text & Search Utilities (ของเดิมที่กู้คืนมา) ---

export function normalizeThai(text) {
    if (typeof text !== 'string') return text || '';
    let normalized = text.normalize('NFC');
    // แก้สระลอยวรรณยุกต์ซ้อน
    normalized = normalized.replace(/\u0E4D\u0E32/g, '\u0E33');
    normalized = normalized.replace(/\u0E32\u0E4D/g, '\u0E33');
    return normalized;
}

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

export function generateSearchTerms(text) {
    if (!text) return [];
    const str = normalizeThai(text).toLowerCase().trim();
    if (!str) return [];
    return str.split(/\s+/).filter(w => w.length > 0);
}

// --- 4. Date Formatting ---

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

// Alias: เผื่อบางไฟล์เรียกใช้ชื่อ formatDate
export const formatDate = formatTimestamp; 

// --- 5. Video Player Utility (ของเดิมที่กู้คืนมา - สำคัญมากสำหรับหน้า Player) ---

export function generateVideoEmbed(inputUrl) {
    if (!inputUrl) return "";
    let url = inputUrl.trim();

    // กรณีเป็น iframe อยู่แล้ว
    if (url.startsWith('<iframe')) {
        if (!url.includes('loading=')) {
            return url.replace('<iframe', '<iframe loading="lazy"');
        }
        return url; 
    }

    // YouTube
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        return `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0" 
                width="100%" height="100%" 
                frameborder="0" 
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"></iframe>`;
    }

    // Dailymotion
    const dmRegex = /dailymotion\.com\/video\/([a-zA-Z0-9]+)/i;
    const dmMatch = url.match(dmRegex);
    if (dmMatch && dmMatch[1]) {
        const videoId = dmMatch[1];
        return `<iframe src="https://www.dailymotion.com/embed/video/${videoId}?autoplay=1" 
                width="100%" height="100%" 
                frameborder="0" 
                loading="lazy"
                allow="autoplay; fullscreen"></iframe>`;
    }

    // Default (URL ทั่วไป)
    return `<iframe src="${url}" width="100%" height="100%" frameborder="0" loading="lazy" allow="autoplay; fullscreen"></iframe>`;
}
