/**
 * js/modules/top10.js
 * จัดการแสดงผลส่วน 10 อันดับยอดนิยม (Top 10)
 */

import { createAnimeCard } from "./card.js";

/**
 * สร้าง Element ของส่วน Top 10
 * @param {Array} shows - รายการอนิเมะ
 * @param {Array} historyItems - ประวัติการรับชม
 * @returns {Object} { element: HTMLElement, initSwiper: Function }
 */
export function createTop10Section(shows, historyItems) {
    // 1. คัดเฉพาะ 10 อันดับแรก
    const top10Shows = shows.slice(0, 10);
    if (top10Shows.length === 0) return null;

    // 2. สร้าง Wrapper หลัก (layout column)
    const wrapper = document.createElement('div');
    wrapper.className = 'w-full lg:w-2/3 order-1 lg:order-1';

    // 3. สร้าง Section เนื้อหา (เหมือน createCarouselSection เดิม)
    const section = document.createElement('section');
    // เพิ่ม mb-8 หรือ class อื่นๆ ตามต้องการเพื่อให้ระยะห่างเท่าเดิม
    // (ในที่นี้ใส่เพื่อให้เหมือน structure เดิมเป๊ะๆ)
    
    let cardsHtml = '';
    top10Shows.forEach((show, index) => {
        const historyItem = historyItems ? historyItems.find(h => h.showId === show.id) : null;
        cardsHtml += `
            <div class="swiper-slide">
                ${createAnimeCard(show, index + 1, historyItem)}
            </div>
        `;
    });

    section.innerHTML = `
        <h3 class="text-2xl font-bold mb-4">10 อันดับอนิเมะยอดนิยม</h3>
        <div class="swiper relative swiper-top10 pb-4">
            <div class="swiper-wrapper">${cardsHtml}</div>
            <div class="swiper-button-next hidden md:flex items-center justify-center"></div>
            <div class="swiper-button-prev hidden md:flex items-center justify-center"></div>
        </div>
    `;

    wrapper.appendChild(section);

    // 4. ส่งคืน Wrapper และฟังก์ชัน Init Swiper
    return {
        element: wrapper,
        initSwiper: () => {
            return new Swiper(section.querySelector('.swiper-top10'), { 
                slidesPerView: 1.8, 
                spaceBetween: 16,
                navigation: { 
                    nextEl: section.querySelector('.swiper-button-next'), 
                    prevEl: section.querySelector('.swiper-button-prev') 
                },
                observer: true, 
                observeParents: true,
                breakpoints: {
                    640: { slidesPerView: 2.5 }, 
                    768: { slidesPerView: 3.5 }, 
                    1024: { slidesPerView: 4.2 }, 
                    1280: { slidesPerView: 4.5 }, 
                }
            });
        }
    };
}
