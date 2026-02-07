function x(t,e=null,l=null){const o=t.title||"ไม่ระบุชื่อ",n=t.thumbnailUrl||"https://placehold.co/400x600/333/fff?text=No+Img";let a=`${window.location.pathname.includes("/pages/")?"player.html":"pages/player.html"}?id=${t.id}`;l&&l.lastWatchedEpisodeId&&(a+=`&ep_id=${l.lastWatchedEpisodeId}`);const r=(t.tags||[]).includes("อนิเมะพากย์ไทย")?`
        <div class="absolute top-2 left-2 z-10 bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex items-center gap-1">
            <i class="ri-volume-up-line"></i> พากย์ไทย
        </div>`:"",p=t.isCompleted===!0?`
        <div class="absolute bottom-2 left-2 z-10 bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow">
            จบแล้ว
        </div>`:"";let s="";const i=parseFloat(t.latestEpisodeNumber)||0;i>0&&(s=`
        <div class="absolute bottom-2 right-2 z-10 bg-gray-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow">
            ตอนที่ ${i}
        </div>`);let d="";return e&&e>0&&(d=`
        <div class="absolute top-[-4px] right-[14px] w-[42px] h-[55px] bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-black text-lg shadow-lg z-10" style="clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%);">
            ${e}
        </div>`),`
        <a href="${a}" class="block group bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 relative">
            <div class="aspect-[2/3] overflow-hidden relative bg-gray-700">
                ${d}
                ${r}
                ${s}
                <img src="${n}" 
                     alt="${o}" 
                     loading="lazy" 
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                     onerror="this.onerror=null; this.src='https://placehold.co/400x600/333/fff?text=No+Img';">
                ${p}
            </div>
            <div class="text-white p-3 pt-2 h-14"> 
                <h4 class="font-bold text-base overflow-hidden text-ellipsis line-clamp-2 leading-tight">${o}</h4> 
            </div>
        </a>
    `}export{x as c};
