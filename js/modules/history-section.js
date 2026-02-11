/**
 * js/modules/history-section.js
 * จัดการส่วนแสดงผล "ประวัติการรับชม" (History Section)
 */

// Helper: จัดรูปแบบเวลา
function formatDateTime(timestamp) {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    
    if (isToday) {
        return `วันนี้ ${timeStr}`;
    } else {
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' + timeStr;
    }
}

// ... (code ก่อนหน้า)

// สร้าง HTML การ์ดแต่ละใบ
function createHistoryCard(history) {
    const showId = history.showId; 
    const episodeId = history.lastWatchedEpisodeId; 
    const title = history.showTitle;
    const episodeTitle = history.lastWatchedEpisodeTitle || `ตอนที่ ${history.latestEpisodeNumber || 'N/A'}`; 
    const thumbnail = history.showThumbnail || 'https://placehold.co/200x300/333/fff?text=No+Image'; 
    const watchedTime = formatDateTime(history.watchedAt);

    const targetUrl = `pages/player.html?id=${showId}${episodeId ? `&ep_id=${episodeId}` : ''}`;

    // ✅ ปรับปรุง: แก้ไขส่วนแสดงผล Title ให้รองรับ 2 บรรทัด
    return `
        <a href="${targetUrl}" class="flex gap-3 p-2 rounded-xl hover:bg-gray-800/50 transition-all group border border-transparent hover:border-gray-700">
            <div class="relative w-16 h-24 flex-shrink-0">
                <img src="${thumbnail}" 
                     alt="${title}" 
                     class="w-full h-full object-cover rounded-lg shadow-md bg-gray-700 group-hover:brightness-75 transition-all"
                     onerror="this.src='https://placehold.co/64x96?text=N/A'">
                
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="ri-play-circle-fill text-3xl text-green-500 drop-shadow-lg"></i>
                </div>
            </div>

            <div class="flex-grow min-w-0 py-1 flex flex-col justify-center">
                <h4 class="font-bold text-sm text-white line-clamp-2 leading-tight group-hover:text-green-400 transition-colors mb-1">
                    ${title}
                </h4>
                
                <div class="flex items-center gap-2 mt-auto"> <span class="text-[10px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">
                        ${episodeTitle}
                    </span>
                </div>
                <p class="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                    <i class="ri-time-line"></i> ${watchedTime}
                </p>
            </div>
        </a>
    `;
}

// ... (code ส่วนที่เหลือเหมือนเดิม)

/**
 * สร้าง HTML สำหรับส่วนประวัติ
 */
export function renderHistorySectionHTML(historyItems, userId) {
    // 1. กรณีไม่ได้ Login -> แสดงปุ่ม Login
    if (!userId) {
        return `
            <div class="flex justify-between items-center mb-4 px-2">
                <h3 class="text-xl font-bold flex items-center gap-2">
                    <i class="ri-history-line text-green-500"></i> ประวัติ
                </h3>
            </div>
            <div class="bg-gray-800/50 rounded-xl p-6 text-center border border-dashed border-gray-700 flex flex-col items-center justify-center h-[300px]">
                <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <i class="ri-lock-2-line text-3xl text-gray-500"></i>
                </div>
                <p class="text-gray-300 font-medium mb-1">เข้าสู่ระบบเพื่อดูประวัติ</p>
                <p class="text-xs text-gray-500 mb-6 max-w-[200px] mx-auto">ติดตามอนิเมะที่คุณดูค้างไว้ได้ทุกที่ ทุกเวลา</p>
                <button onclick="window.triggerLogin()" class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-green-500/20 transform hover:-translate-y-0.5 flex items-center gap-2">
                    <i class="ri-login-circle-line text-lg"></i> เข้าสู่ระบบ
                </button>
            </div>
        `;
    }

    // 2. กรณี Login แล้ว -> แสดงรายการ
    let cardsHtml = '';
    if (historyItems && historyItems.length > 0) {
        historyItems.forEach(item => { cardsHtml += createHistoryCard(item); });
    } else {
         cardsHtml = `
            <div class="h-[200px] flex flex-col items-center justify-center text-gray-500 opacity-70">
                <i class="ri-film-line text-4xl mb-2"></i>
                <p class="text-sm">ยังไม่มีประวัติการรับชม</p>
                <a href="pages/grid.html" class="text-xs text-green-500 mt-2 hover:underline">เริ่มดูอนิเมะเลย!</a>
            </div>`;
    }

    return `
        <div class="flex justify-between items-center mb-4 px-2">
            <h3 class="text-xl font-bold flex items-center gap-2">
                <i class="ri-history-line text-green-500"></i> ประวัติล่าสุด
            </h3>
            <a href="pages/history.html" class="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded-md">
                ดูทั้งหมด <i class="ri-arrow-right-s-line"></i>
            </a>
        </div>
        <div class="space-y-1 pr-1"> 
            ${cardsHtml} 
        </div>
    `;
}
