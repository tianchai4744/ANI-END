import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectCreative, Parallax } from 'swiper/modules';

// Import CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-creative';

// --- CSS เสริม (Ken Burns Effect & Minimal Nav) ---
const style = document.createElement('style');
style.innerHTML = `
    @keyframes ken-burns {
        0% { transform: scale(1); }
        100% { transform: scale(1.15); }
    }
    .animate-ken-burns {
        animation: ken-burns 20s ease-out infinite alternate;
        will-change: transform;
    }
    /* ปรับปุ่มลูกศรให้เล็กและจางที่สุด เพื่อไม่ให้กวนสายตา */
    .custom-swiper-button {
        width: 40px !important;
        height: 40px !important;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(2px);
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.7) !important;
        transition: all 0.3s ease;
    }
    .custom-swiper-button:hover {
        background: rgba(0, 0, 0, 0.5);
        color: white !important;
        border-color: rgba(255, 255, 255, 0.2);
    }
    .custom-swiper-button::after { font-size: 16px !important; }
`;
document.head.appendChild(style);

// ส่วนแสดงผลโครงร่างรอโหลด (Skeleton)
export function renderHeroSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="swiper-wrapper">
                <div class="swiper-slide w-full h-full bg-gray-900 animate-pulse flex items-center justify-center">
                    <i class="ri-image-2-line text-6xl text-gray-800"></i>
                </div>
            </div>
        `;
    }
}

// ฟังก์ชันสร้าง HTML ของแต่ละสไลด์ (Ultra Minimal)
function createSlideHTML(banner, historyItems = []) {
    // คำนวณลิงก์ปลายทาง (ระบบจำตอนที่ดูค้างไว้)
    const history = historyItems.find(h => h.showId === banner.id);
    const epNumber = history?.latestEpisodeNumber || 1;
    const epId = history?.lastWatchedEpisodeId || '';

    let targetUrl = `pages/player.html?id=${banner.id}`;
    if (history && epId) {
        targetUrl += `&ep=${epNumber}&ep_id=${epId}`;
    }

    const imgUrl = banner.bannerImageUrl || 'https://placehold.co/1920x1080/111/fff?text=No+Image';

    // Badge สถานะเล็กจิ๋ว (ถ้ามีประวัติให้โชว์ว่าดูถึงไหน ถ้าไม่มีก็ปล่อยว่างเลยเพื่อให้ภาพเด่นสุด)
    const statusLabel = history 
        ? `<span class="text-[10px] text-green-400 font-medium tracking-wide drop-shadow-md"><i class="ri-play-circle-line"></i> ดูต่อ EP.${epNumber}</span>` 
        : ``; 

    return `
        <a href="${targetUrl}" class="swiper-slide relative w-full h-full overflow-hidden bg-black group block cursor-pointer">
            
            <div class="absolute inset-0 w-full h-full overflow-hidden" data-swiper-parallax="50%">
                 <img src="${imgUrl}" 
                     alt="${banner.title}" 
                     class="w-full h-full object-cover animate-ken-burns opacity-90 transition-opacity duration-700"
                     loading="lazy">
            </div>

            <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>

            <div class="absolute inset-0 container mx-auto px-4 sm:px-6 flex items-end pb-8 sm:pb-10 z-10 pointer-events-none">
                <div class="w-full pointer-events-auto" data-swiper-parallax="-200">
                    
                    <div class="mb-1 opacity-80">
                        ${statusLabel}
                    </div>

                    <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg tracking-tight transition-transform duration-500 group-hover:-translate-y-1">
                        ${banner.title}
                    </h2>
                    
                    <div class="w-12 h-1 bg-green-500 rounded-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                </div>
            </div>
        </a>
    `;
}

// ฟังก์ชันหลัก Render Banner
export function renderHeroBanner(containerId, banners, historyItems, userId) {
    const swiperContainer = document.getElementById(containerId);
    if (!swiperContainer) return;
    
    // สร้างโครงสร้าง
    if (!swiperContainer.querySelector('.swiper-wrapper')) {
        swiperContainer.innerHTML = `
            <div class="swiper-wrapper"></div>
            <div class="absolute bottom-6 right-6 z-20 flex gap-2 hidden sm:flex">
                <div class="swiper-button-prev custom-swiper-button flex items-center justify-center cursor-pointer"></div>
                <div class="swiper-button-next custom-swiper-button flex items-center justify-center cursor-pointer"></div>
            </div>
            <div class="swiper-pagination"></div>
        `;
    }

    const wrapper = swiperContainer.querySelector('.swiper-wrapper');
    if (!banners || banners.length === 0) {
        wrapper.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">No Banners Available</div>`;
        return;
    }

    wrapper.innerHTML = banners.map(banner => createSlideHTML(banner, historyItems)).join('');

    // Config Swiper
    new Swiper(`#${containerId}`, {
        modules: [Navigation, Pagination, Autoplay, EffectCreative, Parallax],
        
        loop: true,
        speed: 1500, // เปลี่ยนภาพช้าลงอีกนิดเพื่อให้ดู Cinematic
        parallax: true,
        
        // Effect แบบ Creative ที่นุ่มนวล
        effect: 'creative',
        creativeEffect: {
            prev: {
                shadow: true,
                translate: ['-20%', 0, -1],
                opacity: 0.6, // ให้ภาพเก่าจางลงตอนเลื่อน
            },
            next: {
                translate: ['100%', 0, 0],
            },
        },
        
        autoplay: {
            delay: 7000, // โชว์ภาพนานขึ้น (7 วิ)
            disableOnInteraction: false,
            pauseOnMouseEnter: true
        },

        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            dynamicBullets: true,
        },

        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        
        allowTouchMove: true,
    });
}
