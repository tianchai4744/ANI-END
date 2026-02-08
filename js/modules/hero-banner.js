import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectCreative, Parallax } from 'swiper/modules';

// Import CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-creative';

// --- CSS เสริม (คงเดิม) ---
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
    .custom-swiper-button {
        width: 40px !important;
        height: 40px !important;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(2px);
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.7) !important;
        transition: all 0.3s ease;
        z-index: 50; /* เพิ่ม Z-Index เพื่อให้แน่ใจว่าปุ่มอยู่บนสุด */
    }
    .custom-swiper-button:hover {
        background: rgba(0, 0, 0, 0.5);
        color: white !important;
        border-color: rgba(255, 255, 255, 0.2);
    }
    .custom-swiper-button::after { font-size: 16px !important; }
`;
document.head.appendChild(style);

// ส่วนแสดงผลโครงร่างรอโหลด (คงเดิม)
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

// [FIXED] ปรับปรุงฟังก์ชันสร้าง HTML: เปลี่ยนโครงสร้างเพื่อแก้ปัญหาลิงก์กดไม่ได้
function createSlideHTML(banner, historyItems = []) {
    // 1. ตรวจสอบ ID ให้แน่ใจว่ามีค่า
    if (!banner.id) return ''; 

    // 2. คำนวณลิงก์ปลายทาง
    const history = historyItems.find(h => h.showId === banner.id);
    const epNumber = history?.latestEpisodeNumber || 1;
    const epId = history?.lastWatchedEpisodeId || '';

    // สร้าง Path ให้รองรับทั้งการเข้าจากหน้า Index และหน้าอื่นๆ (Best Practice)
    // ตรวจสอบว่าปัจจุบันอยู่ใน folder pages หรือไม่ ถ้าใช่ให้ถอยกลับ
    let targetUrl = `pages/player.html?id=${banner.id}`;
    if (history && epId) {
        targetUrl += `&ep=${epNumber}&ep_id=${epId}`;
    }

    const imgUrl = banner.bannerImageUrl || 'https://placehold.co/1920x1080/111/fff?text=No+Image';

    const statusLabel = history 
        ? `<span class="text-[10px] text-green-400 font-medium tracking-wide drop-shadow-md bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm"><i class="ri-play-circle-line"></i> ดูต่อ EP.${epNumber}</span>` 
        : ``; 

    // [CHANGE] เปลี่ยนจาก <a class="swiper-slide"> เป็น <div class="swiper-slide">
    // แล้วใส่ <a> ไว้ข้างในสุดแบบ Absolute Overlay (z-30) เพื่อคลุมทุกอย่าง
    return `
        <div class="swiper-slide relative w-full h-full overflow-hidden bg-black group block">
            
            <a href="${targetUrl}" 
               class="absolute inset-0 z-30 w-full h-full cursor-pointer"
               aria-label="ดู ${banner.title}">
            </a>

            <div class="absolute inset-0 w-full h-full overflow-hidden z-0" data-swiper-parallax="50%">
                 <img src="${imgUrl}" 
                     alt="${banner.title}" 
                     class="w-full h-full object-cover animate-ken-burns opacity-90 transition-opacity duration-700"
                     loading="lazy">
            </div>

            <div class="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10"></div>

            <div class="absolute inset-0 container mx-auto px-4 sm:px-6 flex items-end pb-8 sm:pb-10 z-20 pointer-events-none">
                <div class="w-full" data-swiper-parallax="-200">
                    
                    <div class="mb-2 opacity-90">
                        ${statusLabel}
                    </div>

                    <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg tracking-tight transition-transform duration-500 group-hover:-translate-y-1 line-clamp-2">
                        ${banner.title}
                    </h2>
                    
                    <div class="w-12 h-1 bg-green-500 rounded-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                </div>
            </div>
        </div>
    `;
}

export function renderHeroBanner(containerId, banners, historyItems, userId) {
    const swiperContainer = document.getElementById(containerId);
    if (!swiperContainer) return;
    
    // สร้างโครงสร้าง (เพิ่ม z-index ให้ปุ่ม Navigation อยู่เหนือ Link Overlay)
    if (!swiperContainer.querySelector('.swiper-wrapper')) {
        swiperContainer.innerHTML = `
            <div class="swiper-wrapper"></div>
            <div class="absolute bottom-6 right-6 z-40 flex gap-2 hidden sm:flex">
                <div class="swiper-button-prev custom-swiper-button flex items-center justify-center cursor-pointer"></div>
                <div class="swiper-button-next custom-swiper-button flex items-center justify-center cursor-pointer"></div>
            </div>
            <div class="swiper-pagination z-40"></div>
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
        speed: 1000,
        parallax: true,
        
        // [KEY FIX] ป้องกันการคลิกมั่ว แต่ยอมให้คลิก Link ได้
        preventClicks: false,
        preventClicksPropagation: false,
        touchStartPreventDefault: false,
        
        effect: 'creative',
        creativeEffect: {
            prev: {
                shadow: true,
                translate: ['-20%', 0, -1],
                opacity: 0.6,
            },
            next: {
                translate: ['100%', 0, 0],
            },
        },
        
        autoplay: {
            delay: 7000,
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
