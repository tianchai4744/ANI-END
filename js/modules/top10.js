import { createAnimeCard } from "./card.js";
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle'; // เรียกใช้ CSS ของ Swiper

/**
 * สร้างและเริ่มการทำงานของส่วน Top 10
 * @param {Array} shows - รายการอนิเมะทั้งหมด
 * @param {Array} historyItems - ประวัติการรับชม
 * @returns {HTMLElement|null} - Element ที่พร้อมใช้งาน
 */
export function renderTop10Section(shows, historyItems) {
    // 1. Logic: ตัดเฉพาะ 10 อันดับแรก
    const top10Shows = shows.slice(0, 10);
    if (top10Shows.length === 0) return null;

    // 2. UI Construction: สร้าง Wrapper
    const wrapper = document.createElement('section');
    // ✅ แก้ไข: เปลี่ยนจาก lg:w-2/3 เป็น w-full เพื่อให้เต็มจอตามที่ต้องการ
    wrapper.className = 'w-full mb-12 animate-fade-in-up';

    // สร้าง HTML ของการ์ด (ใช้ createAnimeCard ตัวเดิมที่คุณชอบ)
    let cardsHtml = '';
    top10Shows.forEach((show, index) => {
        const historyItem = historyItems ? historyItems.find(h => h.showId === show.id) : null;
        cardsHtml += `
            <div class="swiper-slide">
                ${createAnimeCard(show, index + 1, historyItem)}
            </div>
        `;
    });

    // ใส่โครงสร้างภายใน (Header + Swiper)
    wrapper.innerHTML = `
        <div class="flex items-center justify-between mb-6 px-2">
            <div class="flex items-center gap-3">
                <div class="w-1.5 h-8 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                <h2 class="text-2xl md:text-3xl font-black text-white uppercase tracking-wider drop-shadow-md">
                    Top 10 <span class="text-green-500">ยอดนิยม</span>
                </h2>
            </div>
            
            <div class="flex gap-2">
                <button class="top10-prev w-10 h-10 rounded-full bg-gray-800 hover:bg-green-600 text-white flex items-center justify-center transition-all shadow-lg border border-gray-700">
                    <i class="ri-arrow-left-s-line text-xl"></i>
                </button>
                <button class="top10-next w-10 h-10 rounded-full bg-gray-800 hover:bg-green-600 text-white flex items-center justify-center transition-all shadow-lg border border-gray-700">
                    <i class="ri-arrow-right-s-line text-xl"></i>
                </button>
            </div>
        </div>

        <div class="swiper top10-swiper w-full px-2 py-4 !overflow-visible">
            <div class="swiper-wrapper">
                ${cardsHtml}
            </div>
        </div>
    `;

    // 3. Behavior: ตั้งค่า Swiper
    setTimeout(() => {
        new Swiper(wrapper.querySelector('.top10-swiper'), { 
            // ปรับจำนวนการแสดงผลให้เหมาะสมกับความกว้างเต็มจอ
            slidesPerView: 2, 
            spaceBetween: 16,
            navigation: { 
                nextEl: wrapper.querySelector('.top10-next'), 
                prevEl: wrapper.querySelector('.top10-prev') 
            },
            observer: true, 
            observeParents: true,
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
