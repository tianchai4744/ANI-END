/**
 * js/modules/history-section.js
 * จัดการส่วนแสดงผล "ประวัติการรับชม" (History Section)
 */

// Helper: จัดรูปแบบเวลา (เฉพาะส่วนนี้มีความต้องการพิเศษเรื่อง "วันนี้")
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

function createHistoryCard(history) {
    const showId = history.showId; 
    const episodeId = history.lastWatchedEpisodeId; 
    const title = history.showTitle;
    const episodeTitle = history.lastWatchedEpisodeTitle || `ตอนที่ ${history.latestEpisodeNumber || 'N/A'}`; 
    const thumbnail = history.showThumbnail || 'https://placehold.co/48x64/333/fff?text=Img'; 
    const watchedTime = formatDateTime(history.watchedAt);

    const targetUrl = `pages/player.html?id=${showId}${episodeId ? `&ep_id=${episodeId}` : ''}`;

    return `
        <a href="${targetUrl}" class="history-card shadow-md group">
            <div class="relative">
                <img src="${thumbnail}" alt="${title}" class="history-thumb shadow-sm group-hover:brightness-75 transition-all">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="ri-play-circle-fill text-2xl text-green-500"></i>
                </div>
            </div>
            <div class="flex-grow min-w-0">
                <h4 class="font-bold text-sm text-white line-clamp-1 group-hover:text-green-400 transition-colors">${title}</h4>
                <p class="text-xs text-gray-300 line-clamp-1">${episodeTitle}</p>
                <p class="text-xs text-gray-400 mt-1">เข้าชม: ${watchedTime}</p>
            </div>
        </a>
    `;
}

/**
 * สร้าง HTML สำหรับส่วนประวัติ
 * @param {Array} historyItems - รายการประวัติ
 * @param {string|null} userId - UID ของผู้ใช้ (ถ้า null แสดงว่ายังไม่ล็อกอิน)
 * @returns {string} - HTML String พร้อมนำไปใส่ใน innerHTML
 */
export function renderHistorySectionHTML(historyItems, userId) {
    // 1. กรณีไม่ได้ Login -> แสดงปุ่ม Login
    if (!userId) {
        return `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-2xl font-bold">ประวัติ</h3>
            </div>
            <div class="bg-gray-800 rounded-lg p-6 text-center border border-gray-700 flex flex-col items-center justify-center min-h-[200px]">
                <i class="ri-lock-2-line text-4xl text-gray-500 mb-3"></i>
                <p class="text-gray-300 font-medium mb-1">เข้าสู่ระบบเพื่อดูประวัติ</p>
                <p class="text-xs text-gray-500 mb-4">บันทึกประวัติการรับชมของคุณเพื่อให้ดูต่อได้ทุกที่</p>
                <button onclick="window.triggerLogin()" class="bg-white hover:bg-gray-200 text-gray-900 px-6 py-2 rounded-full text-sm font-bold transition-colors shadow-lg flex items-center gap-2">
                    <i class="ri-google-fill text-lg text-red-600"></i> เข้าสู่ระบบ
                </button>
            </div>
        `;
    }

    // 2. กรณี Login แล้ว -> แสดงรายการ
    let cardsHtml = '';
    if (historyItems && historyItems.length > 0) {
        historyItems.forEach(item => { cardsHtml += createHistoryCard(item); });
    } else {
         cardsHtml = `<div class="p-4 text-center text-gray-400 text-sm bg-gray-800 rounded-lg">
                        <i class="ri-time-line text-2xl mb-2 block"></i>
                        ไม่พบประวัติการเข้าชม
                    </div>`;
    }

    return `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-2xl font-bold">ประวัติ</h3>
            <a href="pages/history.html" class="text-green-500 hover:text-green-400 font-medium flex items-center text-sm">
                ดูทั้งหมด <i class="ri-arrow-right-s-line ml-1"></i>
            </a>
        </div>
        <div class="space-y-2"> ${cardsHtml} </div>
    `;
}
