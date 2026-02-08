import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectCreative, Parallax } from 'swiper/modules';

// Import CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-creative';

// --- CSS เสริมสำหรับ Animation และ Play Icon ---
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
    /* Play Icon ที่จะโผล่มาตรงกลางเมื่อเอาเมาส์ชี้ */
    .play-overlay {
        opacity: 0;
        transition: all 0.4s ease;
        transform: scale(0.8);
    }
    .swiper-slide:hover .play-overlay {
        opacity: 1;
        transform: scale(1);
    }
    /* ปรับปุ่มลูกศรข้างๆ ให้ดูคลีน */
    .custom-swiper-button {
        width: 50px !important;
        height: 50px !important;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(4px);
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white !important;
        transition: all 0.3s ease;
    }
    .custom-swiper-button:hover {
        background: rgba(0, 184, 124, 0.9);
        border-color: #00b87c;
        transform: scale(1.1);
    }
    .custom-swiper-button::after { font-size: 20px !important; font-weight: bold; }
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

// ฟังก์ชันสร้าง HTML ของแต่ละสไลด์ (แบบคลีน ไม่มีปุ่ม)
function createSlideHTML(banner, historyItems = []) {
    // 1. คำนวณลิงก์ปลายทาง (ฉลาดเลือก)
    const history = historyItems.find(h => h.showId === banner.id);
    const epNumber = history?.latestEpisodeNumber || 1;
    const epId = history?.lastWatchedEpisodeId || '';

    let targetUrl = `pages/player.html?id=${banner.id}`;
    // ถ้ามีประวัติ ให้กระโดดไปตอนที่ดูค้างเลย
    if (history && epId) {
        targetUrl += `&ep=${epNumber}&ep_id=${epId}`;
    }

    // รูปภาพ
    const imgUrl = banner.bannerImageUrl || 'https://placehold.co/1920x1080/111/fff?text=No+Image';

    // Badge สถานะ
    const statusBadge = history 
        ? `<span class="bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1"><i class="ri-play-circle-fill"></i> ดูต่อ EP.${epNumber}</span>`
        : `<span class="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md border border-white/20">NEW</span>`;

    // 2. ใช้ <a> ครอบทั้งหมดแทน div
    return `
        <a href="${targetUrl}" class="swiper-slide relative w-full h-full overflow-hidden bg-black group block cursor-pointer">
            
            <div class="absolute inset-0 w-full h-full overflow-hidden" data-swiper-parallax="50%">
                 <img src="${imgUrl}" 
                     alt="${banner.title}" 
                     class="w-full h-full object-cover animate-ken-burns opacity-80 group-hover:opacity-60 transition-opacity duration-700"
                     loading="lazy">
            </div>

            <div class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div class="play-overlay w-20 h-20 rounded-full bg-green-500/90 text-white flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.6)] backdrop-blur-sm">
                    <i class="ri-play-fill text-5xl ml-1"></i>
                </div>
            </div>

            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 pointer-events-none"></div>

            <div class="absolute inset-0 container mx-auto px-4 sm:px-8 flex items-end pb-10 sm:pb-14 z-10 pointer-events-none">
                <div class="w-full max-w-4xl pointer-events-auto" data-swiper-parallax="-300" data-swiper-parallax-opacity="0">
                    
                    <div class="flex items-center gap-3 mb-3">
                        ${statusBadge}
                        <div class="flex items-center gap-1 text-yellow-400 text-sm font-bold drop-shadow-md">
                            <i class="ri-star-fill"></i> ${banner.rating || 'N/A'}
                        </div>
                        <span class="text-gray-400 text-xs font-medium border border-gray-700 px-1.5 py-0.5 rounded">
                            ${banner.type || 'TV'}
                        </span>
                    </div>

                    <h2 class="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-none mb-2 drop-shadow-2xl tracking-tighter transition-transform duration-500 group-hover:-translate-y-2" 
                        style="text-shadow: 0 4px 20px rgba(0,0,0,0.8);">
                        ${banner.title}
                    </h2>

                    <p class="text-gray-400 text-sm sm:text-lg line-clamp-1 max-w-2xl opacity-80 group-hover:text-white transition-colors">
                        ${banner.synopsis || 'กดเพื่อรับชมทันที'}
                    </p>
                </div>
            </div>
        </a>
    `;
}

// ฟังก์ชันหลัก Render Banner
export function renderHeroBanner(containerId, banners, historyItems, userId) {
    const swiperContainer = document.getElementById(containerId);
    if (!swiperContainer) return;
    
    // สร้างโครงสร้างพื้นฐาน
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

    // Config Swiper
    new Swiper(`#${containerId}`, {
        modules: [Navigation, Pagination, Autoplay, EffectCreative, Parallax],
        
        loop: true,
        speed: 1200,
        parallax: true,
        
        effect: 'creative',
        creativeEffect: {
            prev: {
                shadow: true,
                translate: ['-20%', 0, -1],
            },
            next: {
                translate: ['100%', 0, 0],
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
