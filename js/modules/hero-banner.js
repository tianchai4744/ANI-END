import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectCreative, Parallax } from 'swiper/modules';

// Import CSS
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-creative';

// --- CSS เสริม (ปรับแต่งปุ่มและ Animation) ---
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
    /* ปรับปุ่มให้กดง่ายขึ้นและไม่บังสายตา */
    .custom-swiper-button {
        width: 40px !important;
        height: 40px !important;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(2px);
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.7) !important;
        transition: all 0.3s ease;
        z-index: 50; /* สำคัญ: ต้องอยู่เหนือ Link Overlay */
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

// ฟังก์ชันสร้าง HTML ของแต่ละสไลด์
function createSlideHTML(banner, historyItems = []) {
    if (!banner) return '';

    // --- ส่วนที่ 1: คำนวณลิงก์ (Resume Logic) ---
    // ตรวจสอบประวัติการดูของเรื่องนี้
    const history = historyItems.find(h => h.showId === banner.id);
    
    // ถ้าเคยดูแล้ว ให้ใช้เลขตอนล่าสุด ถ้าไม่เคย ให้เริ่มตอนที่ 1
    const epNumber = history?.latestEpisodeNumber || 1;
    const epId = history?.lastWatchedEpisodeId || '';

    // ตรวจสอบ Path ว่าเราอยู่หน้าไหน (เผื่อใช้ในหน้าอื่นที่ไม่ใช่ index)
    const isPages = window.location.pathname.includes('/pages/');
    const basePath = isPages ? 'player.html' : 'pages/player.html';

    // สร้าง URL ปลายทาง
    let targetUrl = `${basePath}?id=${banner.id}`;
    
    // ถ้ามีประวัติการดู ให้ต่อท้ายด้วยข้อมูลตอนเดิม (Resume)
    if (history && epId) {
        targetUrl += `&ep=${epNumber}&ep_id=${epId}`;
    }

    const imgUrl = banner.bannerImageUrl || 'https://placehold.co/1920x1080/111/fff?text=No+Image';

    // Badge แสดงสถานะ "ดูต่อ"
    const statusLabel = history 
        ? `<span class="inline-flex items-center gap-1 text-[11px] font-medium text-green-400 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full border border-green-500/30 mb-2">
             <i class="ri-play-circle-line"></i> ดูต่อ EP.${epNumber}
           </span>` 
        : ``; 

    // --- ส่วนที่ 2: สร้าง HTML (Structure Fix) ---
    // เปลี่ยนจาก <a class="swiper-slide"> เป็น <div> เพื่อแก้บั๊ก Swiper
    // แล้วใช้ <a> แบบ absolute (Overlay) คลุมทับแทน
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
                    
                    <div class="opacity-90 transform transition-transform duration-500 group-hover:translate-y-[-4px]">
                        ${statusLabel}
                    </div>

                    <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg tracking-tight line-clamp-2">
                        ${banner.title}
                    </h2>
                    
                    <div class="w-12 h-1 bg-green-500 rounded-full mt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] translate-y-4 group-hover:translate-y-0"></div>
                </div>
            </div>
        </div>
    `;
}

// ฟังก์ชันหลัก Render Banner
export function renderHeroBanner(containerId, banners, historyItems, userId) {
    const swiperContainer = document.getElementById(containerId);
    if (!swiperContainer) return;
    
    // สร้างโครงสร้าง Swiper
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

    // Render สไลด์
    wrapper.innerHTML = banners.map(banner => createSlideHTML(banner, historyItems)).join('');

    // Config Swiper
    new Swiper(`#${containerId}`, {
        modules: [Navigation, Pagination, Autoplay, EffectCreative, Parallax],
        
        loop: true,
        speed: 1000,
        parallax: true,
        
        // Settings สำคัญ: อนุญาตให้คลิกได้ และไม่ขัดขวางการทำงานของ Link
        preventClicks: false,
        preventClicksPropagation: false,
        
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
