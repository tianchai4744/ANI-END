import { formatTimestamp } from "../utils/common.js";

export function createAnimeCard(show, history = null) {
    // ✅ จุดที่แก้ไข: เช็คว่าตอนนี้อยู่หน้าไหน เพื่อสร้างลิงก์ให้ถูก
    // ถ้า url มีคำว่า /pages/ แสดงว่าอยู่ห้องใน -> ไปหา player.html ได้เลย
    // ถ้าไม่มี (อยู่หน้าแรก) -> ต้องเดินเข้าห้อง pages/player.html
    const isPages = window.location.pathname.includes('/pages/');
    const basePath = isPages ? 'player.html' : 'pages/player.html';

    // เช็คประวัติการดู
    let progressHtml = '';
    let lastEpText = '';
    
    // สร้างลิงก์โดยใช้ basePath ที่คำนวณไว้ (ไม่มี / นำหน้าแล้ว)
    let linkUrl = `${basePath}?id=${show.id}`;

    if (history) {
        if (history.lastWatchedEpisodeId) {
            linkUrl += `&ep_id=${history.lastWatchedEpisodeId}`;
        }
        if (history.progress > 0) {
            progressHtml = `
                <div class="absolute bottom-0 left-0 h-1 bg-red-600/50 w-full">
                    <div class="h-full bg-red-600" style="width: ${history.progress}%"></div>
                </div>
            `;
        }
        lastEpText = `<span class="text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded ml-2">ดูถึงตอนที่ ${history.lastWatchedEpisodeNumber || 1}</span>`;
    }

    const col = document.createElement('div');
    col.className = 'bg-gray-800 rounded-lg overflow-hidden hover:scale-105 transition-transform duration-300 relative group shadow-lg';
    
    col.innerHTML = `
        <a href="${linkUrl}" class="block relative aspect-[2/3] overflow-hidden">
            <img src="${show.thumbnailUrl}" alt="${show.title}" 
                 class="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                 loading="lazy"
                 onerror="this.src='https://placehold.co/200x300?text=No+Image'">
            
            <div class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                ⭐ ${show.rating || 'N/A'}
            </div>
            
            ${history ? `<div class="absolute top-2 left-2 bg-green-600 text-white text-[10px] px-2 py-1 rounded shadow">เคยดู</div>` : ''}
            
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <div class="bg-green-500 text-white rounded-full p-3 shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                    <i class="ri-play-fill text-2xl"></i>
                </div>
            </div>
            ${progressHtml}
        </a>
        
        <div class="p-3">
            <h3 class="font-bold text-white text-sm truncate mb-1" title="${show.title}">${show.title}</h3>
            <div class="flex items-center justify-between text-xs text-gray-400">
                <span>${show.releaseYear || 'Unknown'}</span>
                <span class="border border-gray-600 px-1 rounded">${show.type || 'TV'}</span>
            </div>
            ${lastEpText ? `<div class="mt-2 flex justify-end">${lastEpText}</div>` : ''}
        </div>
    `;

    return col;
}
