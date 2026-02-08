import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectCreative, Parallax } from 'swiper/modules';

// Import CSS ให้ครบ
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-creative';

// --- ส่วนเสริม: สร้าง CSS Animation (Ken Burns) อัตโนมัติ โดยไม่ต้องไปแก้ไฟล์ CSS ---
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
    /* ปรับปุ่มกดให้ดู Minimal */
    .custom-swiper-button {
        width: 50px !important;
        height: 50px !important;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(4px);
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white !important;
        transition: all 0.3s ease;
    }
    .custom-swiper-button:hover {
        background: rgba(0, 184, 124, 0.8);
        border-color: #00b87c;
        transform: scale(1.1);
    }
    .custom-swiper-button::after {
        font-size: 20px !important;
        font-weight: bold;
    }
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

// ฟังก์ชันสร้างปุ่ม Action (ปรับดีไซน์ให้โปร่งแสง ไม่บังรูป)
function createActionButtons(showId, epId, epNumber, isHistory) {
    if (isHistory) {
        return `
            <a href="pages/player.html?id=${showId}&ep=${epNumber}&ep_id=${epId}" 
               class="group relative inline-flex items-center gap-2 bg-white/10 hover:bg-green-500 text-white backdrop-blur-md border border-white/20 hover:border-green-500 px-6 py-2 rounded-full font-bold transition-all duration-300 shadow-lg overflow-hidden">
                <span class="relative z-10 flex items-center gap-2"><i class="ri-play-fill text-xl"></i> ดูต่อ EP.${epNumber}</span>
            </a>
        `;
    }
    return `
        <a href="pages/player.html?id=${showId}" 
           class="group relative inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black px-8 py-2.5 rounded-full font-bold transition-all duration-300 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:-translate-y-1">
            <i class="ri-play-fill text-2xl"></i> <span class="tracking-wide">ดูเลย</span>
        </a>
    `;
}

// ฟังก์ชันสร้าง HTML ของแต่ละสไลด์
function createSlideHTML(banner, historyItems = []) {
    const history = historyItems.find(h => h.showId === banner.id);
    const isHistory = !!history;
    const epNumber = history?.latestEpisodeNumber || 1;
    const epId = history?.lastWatchedEpisodeId || '';

    // รูปภาพ
    const imgUrl = banner.bannerImageUrl || 'https://placehold.co/1920x1080/111/fff?text=No+Image';

    return `
        <div class="swiper-slide relative w-full h-full overflow-hidden bg-black">
            <div class="absolute inset-0 w-full h-full overflow-hidden" data-swiper-parallax="50%">
                 <img src="${imgUrl}" 
                     alt="${banner.title}" 
                     class="w-full h-full object-cover animate-ken-burns"
                     loading="lazy">
            </div>

            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 pointer-events-none"></div>

            <div class="absolute inset-0 container mx-auto px-4 sm:px-8 flex items-end pb-10 sm:pb-14 z-10 pointer-events-none">
                <div class="w-full max-w-4xl pointer-events-auto" data-swiper-parallax="-300" data-swiper-parallax-opacity="0">
                    
                    <div class="flex items-center gap-3 mb-3">
                        <span class="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-lg shadow-red-900/50">
                            Anime
                        </span>
                        <div class="flex items-center gap-1 text-yellow-400 text-sm font-bold drop-shadow-md">
                            <i class="ri-star-fill"></i> ${banner.rating || 'N/A'}
                        </div>
                    </div>

                    <h2 class="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-none mb-6 drop-shadow-2xl tracking-tighter" 
                        style="text-shadow: 0 4px 20px rgba(0,0,0,0.8);">
                        ${banner.title}
                    </h2>

                    <div class="flex items-center gap-4">
                        ${createActionButtons(banner.id, epId, epNumber, isHistory)}
                        
                        <button class="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-sm group">
                            <i class="ri-add-line text-2xl group-hover:rotate-90 transition-transform duration-300"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ฟังก์ชันหลัก Render Banner
export function renderHeroBanner(containerId, banners, historyItems, userId) {
    const swiperContainer = document.getElementById(containerId);
    if (!swiperContainer) return;
    
    // สร้างโครงสร้างพื้นฐาน (เพิ่ม Class ให้ปุ่ม Navigation)
    if (!swiperContainer.querySelector('.swiper-wrapper')) {
        swiperContainer.innerHTML = `
            <div class="swiper-wrapper"></div>
            <div class="swiper-button-prev custom-swiper-button hidden md:flex"></div>
            <div class="swiper-button-next custom-swiper-button hidden md:flex"></div>
            <div class="swiper-pagination"></div>
        `;
    }

    const wrapper = swiperContainer.querySelector('.swiper-wrapper');
    if (!banners || banners.length === 0) {
        wrapper.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">No Banners Available</div>`;
        return;
    }

    wrapper.innerHTML = banners.map(banner => createSlideHTML(banner, historyItems)).join('');

    // ✅ CONFIG: ความหวือหวาระดับ Cinematic
    new Swiper(`#${containerId}`, {
        modules: [Navigation, Pagination, Autoplay, EffectCreative, Parallax],
        
        loop: true,
        speed: 1200,                // เปลี่ยนภาพช้าๆ นุ่มๆ (1.2 วิ)
        parallax: true,             // เปิดใช้งาน Parallax (เลื่อนมิติ)
        
        // 🔥 เอฟเฟกต์ CREATIVE (หวือหวากว่า Fade ปกติ)
        effect: 'creative',
        creativeEffect: {
            prev: {
                shadow: true,
                translate: ['-20%', 0, -1], // ภาพเก่าถอยหลังไปนิดนึง
            },
            next: {
                translate: ['100%', 0, 0],  // ภาพใหม่พุ่งมาจากขวา
            },
        },
        
        autoplay: {
            delay: 6000,
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
