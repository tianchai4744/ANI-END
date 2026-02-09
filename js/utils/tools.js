// js/utils/tools.js

// --- 1. General Utilities ---

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- 2. Image Loading System ---

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
}, { rootMargin: '100px', threshold: 0.01 });

export function observeImages(container = document) {
    const images = container.querySelectorAll('img[data-src]:not(.observed)');
    images.forEach(img => {
        img.classList.add('observed'); 
        imageObserver.observe(img);
    });
}

// --- 3. Text & Search Utilities ---

export function normalizeThai(text) {
    if (typeof text !== 'string') return text || '';
    return text.normalize('NFC').replace(/\u0E4D\u0E32/g, '\u0E33').replace(/\u0E32\u0E4D/g, '\u0E33');
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
    return str ? str.split(/\s+/).filter(w => w.length > 0) : [];
}

// --- 4. Date Formatting ---

export function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) { return '-'; }
}
export const formatDate = formatTimestamp; 

// --- 5. Video Player Utility (แก้ไข 404 และ จอเล็ก) ---

export function generateVideoEmbed(inputUrl) {
    // 1. กัน Error 404 จากลิงก์ว่าง
    if (!inputUrl || inputUrl === 'undefined' || inputUrl === 'null') return "";
    
    let url = inputUrl.trim();
    if (!url) return "";

    // Style บังคับเต็มจอ (แก้ปัญหาจอเล็ก)
    const responsiveStyle = 'class="absolute inset-0 w-full h-full border-0" allowfullscreen webkitallowfullscreen mozallowfullscreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture"';

    // 1. YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
        else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
        else if (url.includes('/embed/')) videoId = url.split('/embed/')[1].split('?')[0];
        return videoId ? `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" ${responsiveStyle}></iframe>` : '';
    }

    // 2. OK.RU (แก้ลิงก์ให้เป็น Embed)
    if (url.includes('ok.ru')) {
        if (!url.startsWith('http')) url = 'https:' + url;
        if (url.includes('/video/')) url = url.replace('/video/', '/videoembed/');
        return `<iframe src="${url}" ${responsiveStyle}></iframe>`;
    }

    // 3. Archive.org (แก้ลิงก์ให้เป็น Embed)
    if (url.includes('archive.org')) {
        if (url.includes('/details/')) url = url.replace('/details/', '/embed/');
        return `<iframe src="${url}" ${responsiveStyle}></iframe>`;
    }

    // 4. Dailymotion
    if (url.includes('dailymotion.com')) {
        let videoId = url.split('/video/')[1]?.split('?')[0];
        return `<iframe src="https://www.dailymotion.com/embed/video/${videoId}?autoplay=1" ${responsiveStyle}></iframe>`;
    }

    // 5. Google Drive
    if (url.includes('drive.google.com')) {
        url = url.replace('/view', '/preview');
        return `<iframe src="${url}" ${responsiveStyle}></iframe>`;
    }

    // 6. Generic Fallback
    // ถ้าเป็น iframe มาแล้ว ให้แก้ width/height เป็นเต็มจอ
    if (url.startsWith('<iframe')) {
        return url.replace(/width="[^"]*"/g, '').replace(/height="[^"]*"/g, '')
                  .replace('<iframe', `<iframe ${responsiveStyle}`);
    }

    // ถ้าเป็นลิงก์ทั่วไป ให้ใส่ iframe ครอบ
    return `<iframe src="${url}" ${responsiveStyle}></iframe>`;
}
