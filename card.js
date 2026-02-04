// ไฟล์: card.js
// แม่พิมพ์สร้างการ์ดอนิเมะ แยกออกมาเพื่อการจัดการที่ง่ายและ Reusable

export function createAnimeCard(show, rankNumber = null, history = null) {
    // 1. ตรวจสอบข้อมูลเบื้องต้น (Fallback กันค่า null)
    const title = show.title || "ไม่ระบุชื่อ";
    const thumbnail = show.thumbnailUrl || 'https://placehold.co/400x600/333/fff?text=No+Img';
    
    // 2. สร้างลิงก์ (Smart Link: ถ้าเคยดูแล้ว ให้ลิงก์ไปตอนล่าสุด)
    const watchedEpisodeId = history ? history.lastWatchedEpisodeId : null;
    let targetUrl = `player.html?id=${show.id}`;
    if (watchedEpisodeId) {
        targetUrl = `player.html?id=${show.id}&ep_id=${watchedEpisodeId}`;
    }

    // 3. สร้าง Badges
    
    // - พากย์ไทย
    const isThaiDub = (show.tags || []).includes('อนิเมะพากย์ไทย');
    const dubBadge = isThaiDub ? `
        <div class="absolute top-2 left-2 z-10 bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex items-center gap-1">
            <i class="ri-volume-up-line"></i> พากย์ไทย
        </div>` : '';
    
    // - จบแล้ว
    const isCompleted = show.isCompleted === true;
    const completedBadge = isCompleted ? `
        <div class="absolute bottom-2 left-2 z-10 bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow">
            จบแล้ว
        </div>` : '';
    
    // - ตอนล่าสุด
    let episodeBadge = '';
    const latestEp = parseFloat(show.latestEpisodeNumber) || 0;
    if (latestEp > 0) {
        episodeBadge = `
        <div class="absolute bottom-2 right-2 z-10 bg-gray-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow">
            ตอนที่ ${latestEp}
        </div>`;
    }

    // - อันดับ (Rank Badge) - แสดงเฉพาะเมื่อมีการส่งค่า rankNumber มาและมากกว่า 0
    let rankBadge = '';
    if (rankNumber && rankNumber > 0) {
        rankBadge = `
        <div class="absolute top-[-4px] right-[14px] w-[42px] h-[55px] bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-black text-lg shadow-lg z-10" style="clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%);">
            ${rankNumber}
        </div>`;
    }

    // 4. Render HTML
    return `
        <a href="${targetUrl}" class="block group bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 relative">
            <div class="aspect-[2/3] overflow-hidden relative bg-gray-700">
                ${rankBadge}
                ${dubBadge}
                ${episodeBadge}
                <img src="${thumbnail}" 
                     alt="${title}" 
                     loading="lazy" 
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                     onerror="this.onerror=null; this.src='https://placehold.co/400x600/333/fff?text=No+Img';">
                ${completedBadge}
            </div>
            <div class="text-white p-3 pt-2 h-14"> 
                <h4 class="font-bold text-base overflow-hidden text-ellipsis line-clamp-2 leading-tight">${title}</h4> 
            </div>
        </a>
    `;
}
