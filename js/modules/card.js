// ไฟล์: card.js (แก้ไขแล้ว รองรับ Lazy Load Pro)
export function createAnimeCard(show, rankNumber = null, history = null) {
    // 1. ตรวจสอบข้อมูลเบื้องต้น
    const title = show.title || "ไม่ระบุชื่อ";
    const thumbnail = show.thumbnailUrl || 'https://placehold.co/400x600/333/fff?text=No+Img';
    
    // 2. สร้างลิงก์
    // เช็คว่าตอนนี้อยู่หน้าไหน? (หน้าแรก หรือ หน้าในโฟลเดอร์ pages)
    const isPages = window.location.pathname.includes('/pages/');
    
    // ถ้าอยู่หน้า pages ให้ไป 'player.html' เฉยๆ (เพราะอยู่ห้องเดียวกัน)
    // ถ้าอยู่หน้าแรก ให้เดินเข้าห้อง 'pages/player.html'
    const basePath = isPages ? 'player.html' : 'pages/player.html';
    
    // ใช้ Backtick (`) เพื่อให้ใส่ตัวแปร ${show.id} ได้จริง
    let targetUrl = `${basePath}?id=${show.id}`; 
    
    if (history && history.lastWatchedEpisodeId) {
        targetUrl += `&ep_id=${history.lastWatchedEpisodeId}`;
    }

    // 3. สร้าง Badges
    const isThaiDub = (show.tags || []).includes('อนิเมะพากย์ไทย');
    const dubBadge = isThaiDub ? `
        <div class="absolute top-2 left-2 z-10 bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex items-center gap-1">
            <i class="ri-volume-up-line"></i> พากย์ไทย
        </div>` : '';
    
    const isCompleted = show.isCompleted === true;
    const completedBadge = isCompleted ? `
        <div class="absolute bottom-2 left-2 z-10 bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow">
            จบแล้ว
        </div>` : '';
    
    let episodeBadge = '';
    const latestEp = parseFloat(show.latestEpisodeNumber) || 0;
    if (latestEp > 0) {
        episodeBadge = `
        <div class="absolute bottom-2 right-2 z-10 bg-gray-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow">
            ตอนที่ ${latestEp}
        </div>`;
    }

    let rankBadge = '';
    if (rankNumber && rankNumber > 0) {
        rankBadge = `
        <div class="absolute top-[-4px] right-[14px] w-[42px] h-[55px] bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-black text-lg shadow-lg z-10" style="clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%);">
            ${rankNumber}
        </div>`;
    }

    // Pixel โปร่งใส (ใช้จองที่ก่อนรูปจริงมา)
    const transparentPixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    // 4. Render HTML
    // - เพิ่ม class 'image-wrapper animate-pulse' ที่กล่องรูป เพื่อทำ Skeleton effect
    // - img ใช้ data-src แทน src และมี class opacity-0 เพื่อทำ Fade-in
    return `
        <a href="${targetUrl}" class="block group bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 relative">
            <div class="aspect-[2/3] overflow-hidden relative bg-gray-700 image-wrapper animate-pulse">
                ${rankBadge}
                ${dubBadge}
                ${episodeBadge}
                <img src="${transparentPixel}" 
                     data-src="${thumbnail}" 
                     alt="${title}" 
                     class="w-full h-full object-cover opacity-0 scale-95 transition-all duration-500 ease-out group-hover:scale-105"
                     loading="lazy">
                ${completedBadge}
            </div>
            <div class="text-white p-3 pt-2 h-14"> 
                <h4 class="font-bold text-base overflow-hidden text-ellipsis line-clamp-2 leading-tight">${title}</h4> 
            </div>
        </a>
    `;
}
