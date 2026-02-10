import { createAnimeCard } from "./card.js";
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle'; 

export function renderTop10Section(shows, historyItems) {
    // 1. คัดกรองข้อมูล 10 อันดับแรก
    const top10Shows = shows.slice(0, 10);
    if (top10Shows.length === 0) return null;

    // 2. สร้าง Container หลัก
    const wrapper = document.createElement('section');
    // ปรับ margin และ padding ให้รองรับ Design ใหม่
    wrapper.className = 'w-full mb-16 relative px-4 sm:px-0'; 

    // สร้างการ์ดแต่ละใบ (Logic เดิม)
    let cardsHtml = '';
    top10Shows.forEach((show, index) => {
        const historyItem = historyItems ? historyItems.find(h => h.showId === show.id) : null;
        // ส่ง index + 1 เพื่อแสดงเลขลำดับ
        cardsHtml += `
            <div class="swiper-slide">
                ${createAnimeCard(show, index + 1, historyItem)}
            </div>
        `;
    });

    // 3. ใส่โครงสร้าง HTML ใหม่ (Premium Box Design)
    wrapper.innerHTML = `
        <div class="absolute inset-0 bg-gradient-to-b from-[#1f2937] to-[#111827] rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] -z-10 mx-0 sm:mx-4 lg:mx-8"></div>
        
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-green-500/10 blur-[100px] -z-10 rounded-full pointer-events-none"></div>

        <div class="container mx-auto px-6 py-10 lg:py-12 relative z-10">
            
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                        <i class="ri-trophy-fill text-2xl text-white"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-black text-white uppercase tracking-wider drop-shadow-md leading-none mb-1">
                            Top 10 <span class="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">ยอดนิยม</span>
                        </h2>
                        <p class="text-sm text-gray-400 font-medium">อนิเมะที่มีคนดูมากที่สุดในขณะนี้</p>
                    </div>
                </div>
                
                <div class="flex gap-2 self-end sm:self-auto">
                    <button class="top10-prev w-10 h-10 rounded-full bg-black/40 hover:bg-green-600 text-white flex items-center justify-center transition-all border border-white/10 hover:border-green-500 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed">
                        <i class="ri-arrow-left-s-line text-xl"></i>
                    </button>
                    <button class="top10-next w-10 h-10 rounded-full bg-black/40 hover:bg-green-600 text-white flex items-center justify-center transition-all border border-white/10 hover:border-green-500 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed">
                        <i class="ri-arrow-right-s-line text-xl"></i>
                    </button>
                </div>
            </div>

            <div class="swiper top10-swiper w-full !overflow-visible">
                <div class="swiper-wrapper">
                    ${cardsHtml}
                </div>
            </div>
        </div>
    `;

    // 4. ตั้งค่า Swiper
    setTimeout(() => {
        const swiperContainer = wrapper.querySelector('.top10-swiper');
        if (swiperContainer) {
            new Swiper(swiperContainer, { 
                slidesPerView: 2, 
                spaceBetween: 16, 
                navigation: { 
                    nextEl: wrapper.querySelector('.top10-next'), 
                    prevEl: wrapper.querySelector('.top10-prev') 
                },
                // ปรับให้เลื่อนทีละนิดเพื่อให้เห็นการ์ดถัดไป
                watchSlidesProgress: true,
                observer: true, 
                observeParents: true,
                breakpoints: {
                    640: { slidesPerView: 3, spaceBetween: 20 }, 
                    768: { slidesPerView: 3, spaceBetween: 24 }, // ปรับให้การ์ดใหญ่ขึ้นนิดนึง
                    1024: { slidesPerView: 4, spaceBetween: 24 }, 
                    1280: { slidesPerView: 5, spaceBetween: 28 }, 
                }
            });
        }
    }, 0);

    return wrapper;
}
