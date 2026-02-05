import { createAnimeCard } from "./card.js";

export function renderRecommendedSection(top30Shows, historyItems) {
    // Logic: ตัดเอาเฉพาะลำดับที่ 11-30 มาแสดงเป็น "แนะนำ"
    const recommendedShows = top30Shows.slice(10, 30);

    // Validation: ถ้าไม่มีข้อมูล ไม่ต้องแสดงส่วนนี้
    if (!recommendedShows || recommendedShows.length === 0) return null;

    const section = document.createElement('section');
    section.className = 'mb-8';

    // Generate Cards HTML
    let cardsHtml = '';
    recommendedShows.forEach(show => {
        // อนิเมะแนะนำไม่ต้องแสดง Rank (ส่ง null)
        const historyItem = historyItems ? historyItems.find(h => h.showId === show.id) : null;
        cardsHtml += `<div class="swiper-slide">${createAnimeCard(show, null, historyItem)}</div>`;
    });

    section.innerHTML = `
        <h3 class="text-2xl font-bold mb-4">อนิเมะแนะนำ</h3>
        <div class="swiper relative swiper-recommended pb-4">
            <div class="swiper-wrapper">${cardsHtml}</div>
            <div class="swiper-button-next hidden md:flex items-center justify-center"></div>
            <div class="swiper-button-prev hidden md:flex items-center justify-center"></div>
        </div>
    `;

    // Initialize Swiper (Logic แยกออกมาเพื่อให้ดูแลได้อิสระ)
    // ใช้ setTimeout 0 เพื่อรอให้ Element ถูกแปะลง DOM หลักก่อน
    setTimeout(() => {
        new Swiper(section.querySelector('.swiper-recommended'), { 
            slidesPerView: 2.5, 
            spaceBetween: 12, 
            navigation: { 
                nextEl: section.querySelector('.swiper-button-next'), 
                prevEl: section.querySelector('.swiper-button-prev') 
            },
            observer: true, 
            observeParents: true,
            // Config การแสดงผล responsive (7-up Style)
            breakpoints: {
                640: { slidesPerView: 4.5 }, 
                768: { slidesPerView: 5.5 },
                1024: { slidesPerView: 6.5 }, 
                1280: { slidesPerView: 7.5 }, 
                1536: { slidesPerView: 7.5 }, 
            }
        });
    }, 0);

    return section;
}
