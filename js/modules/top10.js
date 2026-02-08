import Swiper from 'swiper';
import { Navigation, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

export function renderTop10Section(shows, historyItems) {
    if (!shows || shows.length === 0) return null;

    // สร้าง Section หลักกำหนดให้กว้างเต็ม (w-full)
    const section = document.createElement('section');
    section.className = 'w-full mb-12 animate-fade-in-up';

    // ส่วนหัว (Header)
    section.innerHTML = `
        <div class="flex items-center justify-between mb-6 px-2">
            <div class="flex items-center gap-3">
                <div class="w-1.5 h-8 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                <h2 class="text-2xl md:text-3xl font-black text-white uppercase tracking-wider drop-shadow-md">
                    Top 10 <span class="text-green-500">ยอดนิยม</span>
                </h2>
            </div>
            
            <div class="flex gap-2">
                <button class="top10-prev w-10 h-10 rounded-full bg-gray-800 hover:bg-green-600 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <i class="ri-arrow-left-s-line text-xl"></i>
                </button>
                <button class="top10-next w-10 h-10 rounded-full bg-gray-800 hover:bg-green-600 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <i class="ri-arrow-right-s-line text-xl"></i>
                </button>
            </div>
        </div>

        <div class="swiper top10-swiper w-full px-2 !overflow-visible">
            <div class="swiper-wrapper">
                ${shows.slice(0, 10).map((show, index) => {
                    const rank = index + 1;
                    const history = historyItems.find(h => h.showId === show.id);
                    const epLabel = history 
                        ? `<span class="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded">EP.${history.latestEpisodeNumber}</span>`
                        : `<span class="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">EP.${show.totalEpisodes || '?'}</span>`;

                    return `
                        <div class="swiper-slide !w-[160px] sm:!w-[180px] md:!w-[200px] group cursor-pointer">
                            <a href="pages/player.html?id=${show.id}" class="block relative">
                                <span class="absolute -left-4 -bottom-6 text-[100px] font-black text-transparent stroke-text opacity-20 group-hover:opacity-40 transition-opacity select-none z-0 pointer-events-none" 
                                      style="-webkit-text-stroke: 2px #fff;">
                                    ${rank}
                                </span>

                                <div class="relative w-full aspect-[3/4] rounded-xl overflow-hidden shadow-lg group-hover:shadow-green-500/20 transition-all duration-300 group-hover:-translate-y-2 z-10 bg-gray-800">
                                    <img src="${show.posterUrl}" alt="${show.title}" 
                                         class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                         loading="lazy">
                                    
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                        <div class="flex items-center gap-2 mb-1">
                                            <i class="ri-star-fill text-yellow-400 text-xs"></i>
                                            <span class="text-xs text-gray-200 font-bold">${show.rating || 'N/A'}</span>
                                        </div>
                                        <button class="w-full py-1.5 bg-green-500 hover:bg-green-400 text-black text-xs font-bold rounded-lg shadow-lg">
                                            <i class="ri-play-fill"></i> ดูเลย
                                        </button>
                                    </div>
                                    
                                    <div class="absolute top-2 left-2 z-20 md:hidden">
                                       <div class="w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center border border-white/10 text-white font-bold text-sm">
                                         ${rank}
                                       </div>
                                    </div>
                                </div>

                                <div class="mt-3 pl-1 z-10 relative">
                                    <h3 class="text-sm font-bold text-white truncate group-hover:text-green-400 transition-colors">
                                        ${show.title}
                                    </h3>
                                    <div class="flex items-center gap-2 mt-1">
                                        ${epLabel}
                                        <span class="text-[10px] text-gray-400">${show.type || 'TV'}</span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // เริ่มการทำงานของ Swiper
    setTimeout(() => {
        new Swiper(section.querySelector('.top10-swiper'), {
            modules: [Navigation, FreeMode],
            slidesPerView: 'auto', // คำนวณความกว้างตามเนื้อหา (ทำให้การ์ดเรียงต่อกันสวยงาม)
            spaceBetween: 20,      // ระยะห่าง
            freeMode: true,        // เลื่อนแบบอิสระ
            navigation: {
                nextEl: section.querySelector('.top10-next'),
                prevEl: section.querySelector('.top10-prev'),
            },
        });
    }, 0);

    return section;
}
