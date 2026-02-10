// js/modules/hero-banner.js
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectFade, Parallax } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

// --- 🧠 SERVICE LAYER (Logic) ---
const HeroService = {
    prepareSlideData(banner, historyItems) {
        if (!banner) return null;

        const history = historyItems ? historyItems.find(h => h.showId === banner.id) : null;
        const epNumber = history?.latestEpisodeNumber || 1;
        const epId = history?.lastWatchedEpisodeId || '';
        const isPages = window.location.pathname.includes('/pages/');
        const basePath = isPages ? 'player.html' : 'pages/player.html';

        let targetUrl = `${basePath}?id=${banner.id}`;
        if (history && epId) {
            targetUrl += `&ep=${epNumber}&ep_id=${epId}`;
        }

        return {
            id: banner.id,
            title: banner.title,
            imageUrl: banner.bannerImageUrl || 'https://placehold.co/1920x1080/111/fff?text=No+Image',
            targetUrl: targetUrl,
            epNumber: epNumber,
            hasHistory: !!history
        };
    }
};

// --- 🎨 UI LAYER (View) ---
const HeroUI = {
    renderSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10"></div>
                    <i class="ri-movie-2-line text-6xl text-gray-800 z-0"></i>
                </div>`;
        }
    },

    createSlideHTML(data) {
        if (!data) return '';

        const badgeHTML = data.hasHistory 
            ? `<div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg glass-panel text-green-400 border-green-500/30 mb-3" data-swiper-parallax="-300">
                 <i class="ri-history-line"></i>
                 <span class="text-xs font-semibold tracking-wide">ดูต่อ EP.${data.epNumber}</span>
               </div>`
            : `<div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg glass-panel text-yellow-400 border-yellow-500/30 mb-3" data-swiper-parallax="-300">
                 <i class="ri-fire-fill"></i>
                 <span class="text-xs font-semibold tracking-wide">กำลังมาแรง</span>
               </div>`;

        // 🌟 ปรับแก้: เปลี่ยน div ด้านนอกสุดเป็น <a> เพื่อให้คลิกได้ทั้งสไลด์
        return `
            <a href="${data.targetUrl}" class="swiper-slide relative w-full h-full overflow-hidden bg-black group block">
                <div class="absolute inset-0 w-full h-full z-0">
                    <img src="${data.imageUrl}" 
                         alt="${data.title}" 
                         class="w-full h-full object-cover animate-ken-burns opacity-90"
                         loading="lazy">
                </div>

                <div class="absolute inset-0 hero-mask z-10 pointer-events-none"></div>

                <div class="absolute inset-0 container mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-12 z-20 pointer-events-none">
                    <div class="w-full lg:w-2/3 flex flex-col items-start space-y-2">
                        
                        <div class="transform transition-all duration-700 delay-100 opacity-0 translate-y-4 group-[.swiper-slide-active]:opacity-100 group-[.swiper-slide-active]:translate-y-0">
                            ${badgeHTML}
                        </div>

                        <h2 class="text-3xl sm:text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-2xl line-clamp-2 mb-2" 
                            data-swiper-parallax="-400">
                            ${data.title}
                        </h2>

                        <div class="pt-4 pointer-events-auto transform transition-all duration-700 delay-300 opacity-0 translate-y-4 group-[.swiper-slide-active]:opacity-100 group-[.swiper-slide-active]:translate-y-0">
                            <div class="group/btn relative inline-flex items-center gap-3 bg-white text-black px-6 py-3 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] overflow-hidden cursor-pointer">
                                <div class="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-300 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                <i class="ri-play-fill text-2xl relative z-10"></i>
                                <span class="relative z-10">ดูเลย</span>
                            </div>
                            
                            <div class="ml-3 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white glass-panel hover:bg-white/10 transition-all duration-300 hover:scale-105 backdrop-blur-md cursor-pointer">
                                <i class="ri-information-line text-xl"></i>
                                <span class="hidden sm:inline">ข้อมูล</span>
                            </div>
                        </div>

                    </div>
                </div>
            </a>`;
    },

    initSwiper(containerId) {
        // ... (ส่วนนี้เหมือนเดิม ไม่มีการเปลี่ยนแปลง)
        return new Swiper(`#${containerId}`, {
            modules: [Navigation, Pagination, Autoplay, EffectFade, Parallax],
            loop: true,
            speed: 1000,
            parallax: true,
            effect: 'fade',
            fadeEffect: { crossFade: true },
            autoplay: { delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true },
            pagination: { el: '.swiper-pagination', clickable: true, dynamicBullets: false },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            allowTouchMove: true,
        });
    }
};

// --- 🎮 CONTROLLER ---
// ... (ส่วนนี้เหมือนเดิม ไม่มีการเปลี่ยนแปลง)
export function renderHeroSkeleton(containerId) { HeroUI.renderSkeleton(containerId); }
export function renderHeroBanner(containerId, banners, historyItems) {
    const swiperContainer = document.getElementById(containerId);
    if (!swiperContainer) return;
    if (!swiperContainer.querySelector('.swiper-wrapper')) {
        swiperContainer.innerHTML = `
            <div class="swiper-wrapper"></div>
            <div class="swiper-pagination z-30"></div>
            <div class="swiper-button-prev"></div>
            <div class="swiper-button-next"></div>
        `;
    }
    const wrapper = swiperContainer.querySelector('.swiper-wrapper');
    if (!banners || banners.length === 0) {
        wrapper.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">No Banners Available</div>`;
        return;
    }
    const slidesHtml = banners.map(banner => {
        const data = HeroService.prepareSlideData(banner, historyItems);
        return HeroUI.createSlideHTML(data);
    }).join('');
    wrapper.innerHTML = slidesHtml;
    HeroUI.initSwiper(containerId);
}
