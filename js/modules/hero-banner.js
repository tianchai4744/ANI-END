// js/modules/hero-banner.js
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectCreative, Parallax } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-creative';

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

        // 🌟 Minimal Design: เหลือแค่ Link, รูปภาพ และ Mask บางๆ
        return `
            <a href="${data.targetUrl}" class="swiper-slide relative w-full h-full overflow-hidden bg-black group block cursor-pointer">
                <div class="absolute inset-0 w-full h-full z-0 transform transition-transform duration-700">
                    <img src="${data.imageUrl}" 
                         alt="${data.title}" 
                         class="w-full h-full object-cover animate-ken-burns opacity-100"
                         loading="lazy">
                </div>

                <div class="absolute inset-0 hero-mask z-10 pointer-events-none transition-opacity duration-500 group-hover:opacity-60"></div>
                
                <div class="absolute inset-0 z-20 pointer-events-none bg-white/0 group-hover:bg-white/5 transition-colors duration-300"></div>
            </a>`;
    },

    initSwiper(containerId) {
        return new Swiper(`#${containerId}`, {
            modules: [Navigation, Pagination, Autoplay, EffectCreative, Parallax],
            loop: true,
            speed: 1200, // สไลด์ช้าลงนิดนึงให้ดูสมูท
            parallax: true,
            
            // 🌟 Professional Creative Effect 
            effect: 'creative',
            creativeEffect: {
                prev: {
                    shadow: true,
                    translate: ['-20%', 0, -1], // ภาพเก่าถอยหลังไป
                    opacity: 0.6,
                },
                next: {
                    translate: ['100%', 0, 0], // ภาพใหม่สไลด์เข้ามา
                },
            },

            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: false 
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            allowTouchMove: true,
        });
    }
};

// --- 🎮 CONTROLLER ---
export function renderHeroSkeleton(containerId) { HeroUI.renderSkeleton(containerId); }
export function renderHeroBanner(containerId, banners, historyItems) {
    const swiperContainer = document.getElementById(containerId);
    if (!swiperContainer) return;

    if (!swiperContainer.querySelector('.swiper-wrapper')) {
        swiperContainer.innerHTML = `
            <div class="swiper-wrapper"></div>
            <div class="swiper-pagination z-30"></div>
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
