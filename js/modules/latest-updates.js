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

    section.innerHTML = `
        <h3 class="text-2xl font-bold mb-4">อนิเมะอัปเดตใหม่</h3>
        <div class="swiper relative swiper-latest pb-4">
            <div class="swiper-wrapper">${cardsHtml}</div>
            <div class="swiper-button-next hidden md:flex items-center justify-center"></div>
            <div class="swiper-button-prev hidden md:flex items-center justify-center"></div>
        </div>
    `;

    setTimeout(() => {
        new Swiper(section.querySelector('.swiper-latest'), { 
            slidesPerView: 2.5, 
            spaceBetween: 12, 
            navigation: { 
                nextEl: section.querySelector('.swiper-button-next'), 
                prevEl: section.querySelector('.swiper-button-prev') 
            },
            observer: true, 
            observeParents: true,
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
