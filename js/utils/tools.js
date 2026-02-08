// js/utils/tools.js

// --- ระบบ Lazy Loading ระดับมืออาชีพ ---
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            
            if (src) {
                const tempImage = new Image();
                tempImage.src = src;
                
                tempImage.onload = () => {
                    img.src = src;
                    img.classList.remove('opacity-0', 'scale-95'); 
                    img.classList.add('opacity-100', 'scale-100');
                    
                    const wrapper = img.closest('.image-wrapper');
                    if (wrapper) wrapper.classList.remove('animate-pulse');
                    
                    img.removeAttribute('data-src');
                };
                
                tempImage.onerror = () => {
                   img.src = 'https://placehold.co/400x600/333/fff?text=No+Img';
                   img.classList.remove('opacity-0');
                   const wrapper = img.closest('.image-wrapper');
                   if (wrapper) wrapper.classList.remove('animate-pulse');
                };
            }
            observer.unobserve(img);
        }
    });
}, {
    rootMargin: '100px', 
    threshold: 0.01
});

export function observeImages(container = document) {
    const images = container.querySelectorAll('img[data-src]:not(.observed)');
    images.forEach(img => {
        img.classList.add('observed'); 
        imageObserver.observe(img);
    });
}

export function normalizeThai(text) {
    if (typeof text !== 'string') return text || '';
    let normalized = text.normalize('NFC');
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

// ✅ Debounce: ฟังก์ชันหน่วงเวลา (สำคัญมากสำหรับช่องค้นหา)
// ช่วยให้ไม่ส่งคำสั่งค้นหารัวๆ ขณะที่ user กำลังพิมพ์
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

export function generateSearchTerms(text) {
    if (!text) return [];
    const str = normalizeThai(text).toLowerCase().trim();
    if (!str) return [];
    return str.split(/\s+/).filter(w => w.length > 0);
}

// ✅ Improved Video Embed: เพิ่ม loading="lazy" เพื่อประสิทธิภาพ
export function generateVideoEmbed(inputUrl) {
    if (!inputUrl) return "";
    let url = inputUrl.trim();

    if (url.startsWith('<iframe')) {
        // แอบเติม loading="lazy" เข้าไปใน iframe เดิม
        if (!url.includes('loading=')) {
            return url.replace('<iframe', '<iframe loading="lazy"');
        }
        return url; 
    }

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

    // กรณีอื่นๆ
    return `<iframe src="${url}" width="100%" height="100%" frameborder="0" loading="lazy" allow="autoplay; fullscreen"></iframe>`;
}
