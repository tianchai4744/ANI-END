import { createAnimeCard } from "./card.js";

export function renderLatestUpdatesSection(shows, historyItems) {
    if (!shows || shows.length === 0) return null;

    const section = document.createElement('section');
    section.className = 'mb-8';

    let cardsHtml = '';
    shows.forEach(show => {
        const historyItem = historyItems ? historyItems.find(h => h.showId === show.id) : null;
        cardsHtml += `<div class="swiper-slide">${createAnimeCard(show, null, historyItem)}</div>`;
    });

    // เพิ่มปุ่มดูทั้งหมด ลิงก์ไปที่ ?tag=อนิเมะ (หน้ารวม ซึ่ง Default Sort คือ UpdatedAt)
    section.innerHTML = `
        <div class="flex justify-between items-end mb-4 px-1">
            <h3 class="text-2xl font-bold">อนิเมะอัปเดตใหม่</h3>
            <a href="pages/grid.html?tag=อนิเมะ" class="text-sm text-gray-400 hover:text-green-400 transition-colors flex items-center gap-1 group">
                ดูทั้งหมด <i class="ri-arrow-right-s-line group-hover:translate-x-1 transition-transform"></i>
            </a>
        </div>
        <div class="swiper relative swiper-latest pb-4">
            <div class="swiper-wrapper">${cardsHtml}</div>
            <div class="swiper-button-next hidden md:flex items-center justify-center"></div>
            <div class="swiper-button-prev hidden md:flex items-center justify-center"></div>
        </div>
    `;

    setTimeout(() => {
        if (typeof Swiper === 'undefined') return;
        new Swiper(section.querySelector('.swiper-latest'), { 
            slidesPerView: 2.5, spaceBetween: 12, 
            navigation: { nextEl: section.querySelector('.swiper-button-next'), prevEl: section.querySelector('.swiper-button-prev') },
            observer: true, observeParents: true,
            breakpoints: {
                640: { slidesPerView: 4.5 }, 
                768: { slidesPerView: 5.5 },
                1024: { slidesPerView: 6.5 }, 
                1280: { slidesPerView: 7.5 }, 
                1536: { slidesPerView: 7.5 }, 
            }
        });
    }, 100);

    return section;
}
