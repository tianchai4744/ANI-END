// js/modules/hero-banner.js

// ✅ เพิ่มบรรทัดนี้: นำเข้า Swiper จาก node_modules
import Swiper from 'swiper/bundle'; 
// (CSS ของ Swiper เรานำเข้าไว้ที่ style.css แล้ว)

let heroSwiperInstance = null;

// ส่วนแสดงผลโครงร่างรอโหลด (Skeleton)
export function renderHeroSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="w-full h-full bg-gray-800 skeleton relative overflow-hidden">
                <div class="absolute bottom-10 left-4 md:left-10 w-1/3 h-8 bg-gray-700 skeleton rounded mb-2"></div>
                <div class="absolute bottom-4 left-4 md:left-10 w-1/2 h-4 bg-gray-700 skeleton rounded"></div>
            </div>
        `;
    }
}

// ส่วนสร้างสไลด์แบนเนอร์
export function renderHeroBanner(containerId, banners, historyItems, userId) {
    const heroSwiperContainer = document.getElementById(containerId);
    
    if (!heroSwiperContainer) return;
    
    // 1. Destroy instance เก่าทิ้งก่อนเสมอ เพื่อไม่ให้ทำงานซ้อนทับกัน
    if (heroSwiperInstance) {
        heroSwiperInstance.destroy(true, true);
        heroSwiperInstance = null;
    }

    // 2. สร้างโครงสร้าง HTML สำหรับ Swiper
    heroSwiperContainer.innerHTML = `
        <div class="swiper-wrapper"></div>
        <div class="swiper-button-prev hidden md:flex items-center justify-center"></div>
        <div class="swiper-button-next hidden md:flex items-center justify-center"></div>
        <div class="swiper-pagination"></div>
    `;
    
    const swiperWrapper = heroSwiperContainer.querySelector('.swiper-wrapper');
    
    // 3. กรณีโหลดเสร็จแล้วแต่ไม่มีข้อมูลแบนเนอร์
    if (!banners || banners.length === 0) {
        swiperWrapper.innerHTML = '<div class="swiper-slide flex items-center justify-center bg-gray-800 text-gray-500">No Banners</div>';
        return;
    }
    
    // 4. วนลูปสร้าง Slide
    let slidesHtml = '';
    banners.forEach(banner => {
        // Logic เดิม: เช็คประวัติการดูเพื่อสร้างลิงก์ดูต่อ (Resume)
        const historyItem = userId ? historyItems.find(h => h.showId === banner.showId) : null;
        
        let targetUrl = `pages/player.html?id=${banner.showId}`;
        if (historyItem && historyItem.lastWatchedEpisodeId) {
            targetUrl = `pages/player.html?id=${banner.showId}&ep_id=${historyItem.lastWatchedEpisodeId}`;
        }
        
        const imgUrl = banner.bannerImageUrl || 'https://placehold.co/1200x400/222/fff?text=No+Banner';

        slidesHtml += `
            <a href="${targetUrl}" class="swiper-slide relative block w-full h-full">
                <img src="${imgUrl}" alt="${banner.title || 'Banner'}" class="w-full h-full object-cover">
                <div class="banner-overlay"></div>
            </a>
        `;
    });
    
    swiperWrapper.innerHTML = slidesHtml;
    
    // 5. เริ่มต้นการทำงานของ Swiper
    // ✅ ไม่ต้องเช็ค typeof แล้ว เพราะเรา import มาเองด้านบน
    heroSwiperInstance = new Swiper(`#${containerId}`, {
        loop: banners.length > 1, 
        autoplay: { delay: 4000, disableOnInteraction: false },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        pagination: { el: '.swiper-pagination', clickable: true }, 
        slidesPerView: 1, 
        observer: true, 
        observeParents: true
    });
}
