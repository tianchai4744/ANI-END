/**
 * js/modules/top10.js
 * จัดการแสดงผลส่วน 10 อันดับยอดนิยม (Top 10) แบบเบ็ดเสร็จ (Encapsulated)
 */

import { createAnimeCard } from "./card.js";
// ✅ แก้ไข: เพิ่มการ Import Swiper
import Swiper from 'swiper/bundle';

/**
 * สร้างและเริ่มการทำงานของส่วน Top 10
 * @param {Array} shows - รายการอนิเมะทั้งหมด
 * @param {Array} historyItems - ประวัติการรับชม
 * @returns {HTMLElement|null} - Element ที่พร้อมใช้งาน (หรือ null ถ้าไม่มีข้อมูล)
 */
export function renderTop10Section(shows, historyItems) {
    // 1. Logic: คัดกรองข้อมูล (Business Logic)
    // ตัดเฉพาะ 10 อันดับแรก
    const top10Shows = shows.slice(0, 10);
    
    // Validation: ถ้าไม่มีข้อมูล ไม่ต้องทำอะไรต่อ
    if (top10Shows.length === 0) return null;

    // 2. UI Construction: สร้างโครงสร้าง HTML (View Logic)
    const wrapper = document.createElement('div');
    wrapper.className = 'w-full lg:w-2/3 order-1 lg:order-1';

    // สร้าง HTML ของการ์ด
    let cardsHtml = '';
    top10Shows.forEach((show, index) => {
        const historyItem = historyItems ? historyItems.find(h => h.showId === show.id) : null;
        cardsHtml += `
            <div class="swiper-slide">
                ${createAnimeCard(show, index + 1, historyItem)}
            </div>
        `;
    });

    // ใส่โครงสร้างภายใน
    wrapper.innerHTML = `
        <h3 class="text-2xl font-bold mb-4">10 อันดับอนิเมะยอดนิยม</h3>
        <div class="swiper relative swiper-top10 pb-4">
            <div class="swiper-wrapper">${cardsHtml}</div>
            <div class="swiper-button-next hidden md:flex items-center justify-center"></div>
            <div class="swiper-button-prev hidden md:flex items-center justify-center"></div>
        </div>
    `;

    // 3. Behavior: สั่งเริ่มการทำงานของ Swiper (Controller Logic)
    // เราใช้ setTimeout 0 เพื่อรอให้ Element ถูกนำไปวางใน DOM หลักก่อน (Best Practice สำหรับ Swiper)
    setTimeout(() => {
        new Swiper(wrapper.querySelector('.swiper-top10'), { 
            slidesPerView: 1.8, 
            spaceBetween: 16,
            navigation: { 
                nextEl: wrapper.querySelector('.swiper-button-next'), 
                prevEl: wrapper.querySelector('.swiper-button-prev') 
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
    }, 0);

    return wrapper;
}
