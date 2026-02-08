import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';

// Import CSS ของ Swiper ให้ครบเพื่อให้มั่นใจว่า Effect ทำงาน
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

// ส่วนแสดงผลโครงร่างรอโหลด (Skeleton)
export function renderHeroSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="swiper-wrapper">
                <div class="swiper-slide w-full h-full bg-gray-800 animate-pulse flex items-center justify-center">
                    <i class="ri-movie-2-line text-6xl text-gray-700"></i>
                </div>
            </div>
        `;
    }
}

// ฟังก์ชันสร้างปุ่ม "ดูเลย" หรือ "ดูต่อ"
function createActionButtons(showId, epId, epNumber, isHistory) {
    if (isHistory) {
        return `
            <a href="pages/player.html?id=${showId}&ep=${epNumber}&ep_id=${epId}" 
               class="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black px-6 py-2.5 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-green-900/20">
                <i class="ri-play-fill text-xl"></i> ดูต่อตอนที่ ${epNumber}
            </a>
        `;
    }
    return `
        <a href="pages/player.html?id=${showId}" 
           class="inline-flex items-center gap-2 bg-white hover:bg-gray-200 text-black px-6 py-2.5 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg">
            <i class="ri-play-fill text-xl"></i> ดูเลย
        </a>
        <button class="px-4 py-2.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white backdrop-blur-sm transition-colors border border-gray-700 group">
            <i class="ri-add-line text-xl group-active:scale-90 transition-transform"></i>
        </button>
    `;
}

// ฟังก์ชันสร้าง HTML ของแต่ละสไลด์
function createSlideHTML(banner, historyItems = []) {
    const history = historyItems.find(h => h.showId === banner.id);
    const isHistory = !!history;
    const epNumber = history?.latestEpisodeNumber || 1;
    const epId = history?.lastWatchedEpisodeId || '';

    // รูปภาพ: ใช้ loading="eager" เฉพาะรูปแรก เพื่อให้เว็บโหลดไว
    const imgUrl = banner.bannerImageUrl || 'https://placehold.co/1200x480/111/fff?text=No+Image';

    return `
        <div class="swiper-slide relative w-full h-full overflow-hidden bg-gray-900">
            <div class="absolute inset-0">
                <img src="${imgUrl}" 
                     alt="${banner.title}" 
                     class="w-full h-full object-cover object-center transform scale-105 group-hover:scale-100 transition-transform duration-[2000ms]"
                     loading="lazy">
                
                <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
                <div class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/70 to-transparent"></div>
            </div>

            <div class="absolute inset-0 container mx-auto px-4 sm:px-6 flex items-end pb-12 sm:pb-16">
                <div class="w-full max-w-2xl animate-fade-in-up pl-2 md:pl-0">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="bg-gray-800/80 backdrop-blur text-gray-200 text-xs font-medium px-2 py-1 rounded border border-gray-700">
                            <i class="ri-hd-line align-middle"></i> FULL HD
                        </span>
                        <span class="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded border border-yellow-500/30">
                            <i class="ri-star-fill align-middle"></i> ${banner.rating || 'N/A'}
                        </span>
                    </div>

                    <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4 drop-shadow-xl line-clamp-2">
                        ${banner.title}
                    </h2>

                    <p class="text-gray-300 text-sm sm:text-base mb-8 line-clamp-2 sm:line-clamp-3 max-w-xl drop-shadow-md hidden sm:block">
                        ${banner.synopsis || 'ไม่มีรายละเอียดเนื้อเรื่องย่อ'}
                    </p>

                    <div class="flex items-center gap-3">
                        ${createActionButtons(banner.id, epId, epNumber, isHistory)}
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
    
    // สร้างโครงสร้างพื้นฐานถ้ายังไม่มี
    if (!swiperContainer.querySelector('.swiper-wrapper')) {
        swiperContainer.innerHTML = `
            <div class="swiper-wrapper"></div>
            <div class="swiper-button-prev hidden md:flex"></div>
            <div class="swiper-button-next hidden md:flex"></div>
            <div class="swiper-pagination"></div>
        `;
    }

    const wrapper = swiperContainer.querySelector('.swiper-wrapper');
    if (!banners || banners.length === 0) {
        wrapper.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">No Banners Available</div>`;
        return;
    }

    // สร้าง HTML สไลด์
    wrapper.innerHTML = banners.map(banner => createSlideHTML(banner, historyItems)).join('');

    // ✅ สร้าง Swiper พร้อม Config ที่ทำให้ลื่นและสวย
    new Swiper(`#${containerId}`, {
        modules: [Navigation, Pagination, Autoplay, EffectFade], // เปิดใช้งาน Module สำคัญ
        
        loop: true,                 // วนลูป
        speed: 1000,                // ความเร็ว 1 วินาที (นุ่มนวล)
        effect: 'fade',             // เอฟเฟกต์จางหาย (Cross Fade)
        fadeEffect: {
            crossFade: true
        },
        
        autoplay: {
            delay: 6000,            // เปลี่ยนทุก 6 วิ
            disableOnInteraction: false,
            pauseOnMouseEnter: true // เอาเมาส์จ่อแล้วหยุด
        },

        pagination: {
            el: '.swiper-pagination',
            clickable: true,        // จุดไข่ปลากดได้
            dynamicBullets: true,
        },

        navigation: {
            nextEl: '.swiper-button-next', // ปุ่มขวา
            prevEl: '.swiper-button-prev', // ปุ่มซ้าย
        },
        
        allowTouchMove: true,       // รูดบนมือถือได้
    });
}
