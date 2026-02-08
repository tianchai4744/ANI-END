import { createAnimeCard } from "./card.js";
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle'; // สำคัญ: ต้องมีบรรทัดนี้เพื่อให้สไลด์ทำงานและไม่ทะลุ

export function renderTop10Section(shows, historyItems) {
    // 1. คัดกรองข้อมูล 10 อันดับแรก
    const top10Shows = shows.slice(0, 10);
    if (top10Shows.length === 0) return null;

    // 2. สร้าง Container หลัก (กำหนด w-full และ overflow-hidden เพื่อป้องกันการทะลุ)
    const wrapper = document.createElement('section');
    wrapper.className = 'w-full mb-10 overflow-hidden'; 

    // สร้างการ์ดแต่ละใบ
    let cardsHtml = '';
    top10Shows.forEach((show, index) => {
        const historyItem = historyItems ? historyItems.find(h => h.showId === show.id) : null;
        // ส่ง index + 1 เพื่อแสดงเลขลำดับ (1, 2, 3...) บนการ์ด
        cardsHtml += `
            <div class="swiper-slide">
                ${createAnimeCard(show, index + 1, historyItem)}
            </div>
        `;
    });

    // 3. ใส่โครงสร้าง HTML (Header + Swiper)
    wrapper.innerHTML = `
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-1.5 h-8 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                    <h2 class="text-2xl md:text-3xl font-black text-white uppercase tracking-wider drop-shadow-md">
                        Top 10 <span class="text-green-500">ยอดนิยม</span>
                    </h2>
                </div>
                
                <div class="flex gap-2">
                    <button class="top10-prev w-10 h-10 rounded-full bg-gray-800 hover:bg-green-600 text-white flex items-center justify-center transition-all shadow-lg border border-gray-700 disabled:opacity-50">
                        <i class="ri-arrow-left-s-line text-xl"></i>
                    </button>
                    <button class="top10-next w-10 h-10 rounded-full bg-gray-800 hover:bg-green-600 text-white flex items-center justify-center transition-all shadow-lg border border-gray-700 disabled:opacity-50">
                        <i class="ri-arrow-right-s-line text-xl"></i>
                    </button>
                </div>
            </div>

            <div class="swiper top10-swiper w-full !overflow-visible pb-10">
                <div class="swiper-wrapper">
                    ${cardsHtml}
                </div>
            </div>
        </div>
    `;

    // 4. ตั้งค่า Swiper (ให้เลื่อนสวยๆ ตามขนาดหน้าจอ)
    setTimeout(() => {
        new Swiper(wrapper.querySelector('.top10-swiper'), { 
            // จำนวนการ์ดที่แสดงต่อหน้าจอ (ปรับให้เหมาะสมกับ Full Width)
            slidesPerView: 2, 
            spaceBetween: 16, // ช่องว่างระหว่างการ์ด
            navigation: { 
                nextEl: wrapper.querySelector('.top10-next'), 
                prevEl: wrapper.querySelector('.top10-prev') 
            },
            observer: true, 
            observeParents: true,
            // Responsive Breakpoints: จอยิ่งใหญ่ ยิ่งแสดงการ์ดเยอะ
            breakpoints: {
                640: { slidesPerView: 3, spaceBetween: 20 }, 
                768: { slidesPerView: 4, spaceBetween: 20 }, 
                1024: { slidesPerView: 5, spaceBetween: 24 }, 
                1280: { slidesPerView: 6, spaceBetween: 24 }, 
            }
        });
    }, 0);

    return wrapper;
}
