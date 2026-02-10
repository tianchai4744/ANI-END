import { createAnimeCard } from "./card.js";
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle'; 

export function renderTop10Section(shows, historyItems) {
    const top10Shows = shows.slice(0, 10);
    if (top10Shows.length === 0) return null;

    // 1. สร้าง Container หลัก (เป็นแค่ตัวกำหนดตำแหน่งบนหน้าเว็บ)
    const section = document.createElement('section');
    section.className = 'container mx-auto px-4 sm:px-6 lg:px-8 mb-16'; 

    // สร้างการ์ดแต่ละใบ
    let cardsHtml = '';
    top10Shows.forEach((show, index) => {
        const historyItem = historyItems ? historyItems.find(h => h.showId === show.id) : null;
        cardsHtml += `
            <div class="swiper-slide">
                ${createAnimeCard(show, index + 1, historyItem)}
            </div>
        `;
    });

    // 2. ใส่โครงสร้าง HTML แบบ "Boxed Layout" (กล่องหุ้มเนื้อหา)
    section.innerHTML = `
        <div class="relative bg-gradient-to-b from-[#1f2937] to-[#111827] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            
            <div class="absolute top-0 right-0 w-1/2 h-full bg-green-500/5 blur-[100px] pointer-events-none"></div>
            <div class="absolute bottom-0 left-0 w-1/3 h-1/2 bg-blue-500/5 blur-[80px] pointer-events-none"></div>

            <div class="p-6 sm:p-8 lg:p-10 relative z-10">
                
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 shrink-0">
                            <i class="ri-trophy-fill text-2xl text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl md:text-3xl font-black text-white uppercase tracking-wider drop-shadow-md leading-none mb-1">
                                Top 10 <span class="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">ยอดนิยม</span>
                            </h2>
                            <p class="text-sm text-gray-400 font-medium">อนิเมะที่มาแรงที่สุดในสัปดาห์นี้</p>
                        </div>
                    </div>
                    
                    <div class="flex gap-2 self-end sm:self-auto">
                        <button class="top10-prev w-10 h-10 rounded-full bg-black/40 hover:bg-green-600 text-white flex items-center justify-center transition-all border border-white/10 hover:border-green-500 backdrop-blur-sm shadow-md">
                            <i class="ri-arrow-left-s-line text-xl"></i>
                        </button>
                        <button class="top10-next w-10 h-10 rounded-full bg-black/40 hover:bg-green-600 text-white flex items-center justify-center transition-all border border-white/10 hover:border-green-500 backdrop-blur-sm shadow-md">
                            <i class="ri-arrow-right-s-line text-xl"></i>
                        </button>
                    </div>
                </div>

                <div class="swiper top10-swiper w-full">
                    <div class="swiper-wrapper">
                        ${cardsHtml}
                    </div>
                </div>
            </div>
        </div>
    `;

    // 3. ตั้งค่า Swiper
    setTimeout(() => {
        const swiperContainer = section.querySelector('.top10-swiper');
        if (swiperContainer) {
            new Swiper(swiperContainer, { 
                // ปรับจำนวนการ์ดให้พอดีกับพื้นที่ภายในกล่อง
                slidesPerView: 2, 
                spaceBetween: 16, 
                navigation: { 
                    nextEl: section.querySelector('.top10-next'), 
                    prevEl: section.querySelector('.top10-prev') 
                },
                // Responsive Breakpoints: ปรับให้แน่นขึ้นนิดนึงเพราะอยู่ในกล่อง
                breakpoints: {
                    640: { slidesPerView: 3, spaceBetween: 20 }, 
                    1024: { slidesPerView: 4, spaceBetween: 24 }, 
                    1280: { slidesPerView: 5, spaceBetween: 24 }, 
                }
            });
        }
    }, 0);

    return section;
}
