// js/modules/hero-banner.js

let heroSwiperInstance = null;

/**
 * สร้าง Skeleton Loading สำหรับ Hero Banner (แสดงระหว่างรอโหลดข้อมูล)
 */
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

/**
 * เรนเดอร์ Hero Banner Slider และเริ่มการทำงานของ Swiper
 */
export function renderHeroBanner(containerId, banners, historyItems, userId) {
    const heroSwiperContainer = document.getElementById(containerId);
    
    if (!heroSwiperContainer) return;
    
    // เคลียร์ Swiper ตัวเก่าถ้ามี เพื่อป้องกัน Memory Leak หรือบั๊กซ้อนทับ
    if (heroSwiperInstance) {
        heroSwiperInstance.destroy(true, true);
        heroSwiperInstance = null;
    }

    // สร้างโครงสร้าง HTML พื้นฐานของ Swiper
    heroSwiperContainer.innerHTML = `
        <div class="swiper-wrapper"></div>
        <div class="swiper-button-prev hidden md:flex items-center justify-center"></div>
        <div class="swiper-button-next hidden md:flex items-center justify-center"></div>
        <div class="swiper-pagination"></div>
    `;
    
    const swiperWrapper = heroSwiperContainer.querySelector('.swiper-wrapper');
    
    // กรณีไม่มีข้อมูลแบนเนอร์
    if (!banners || banners.length === 0) {
        swiperWrapper.innerHTML = '<div class="swiper-slide flex items-center justify-center bg-gray-800 text-gray-500">No Banners</div>';
        return;
    }
    
    // สร้าง Slide แต่ละแผ่น
    let slidesHtml = '';
    banners.forEach(banner => {
        // เช็คประวัติการดูเพื่อสร้างลิงก์ (Resume Link)
        const historyItem = userId ? historyItems.find(h => h.showId === banner.showId) : null;
        
        let targetUrl = `pages/player.html?id=${banner.showId}`;
        if (historyItem && historyItem.lastWatchedEpisodeId) {
            targetUrl = `pages/player.html?id=${banner.showId}&ep_id=${historyItem.lastWatchedEpisodeId}`;
        }
        
        const imgUrl = banner.bannerImageUrl || 'https://placehold.co/1200x400/222/fff?text=No+Banner';

        // โครงสร้าง HTML เดียวกับ index.html เดิม เพื่อให้ CSS ทำงานได้เหมือนเดิมเป๊ะ
        slidesHtml += `
            <a href="${targetUrl}" class="swiper-slide relative block w-full h-full">
                <img src="${imgUrl}" alt="${banner.title || 'Banner'}" class="w-full h-full object-cover">
                <div class="banner-overlay"></div>
            </a>
        `;
    });
    
    swiperWrapper.innerHTML = slidesHtml;
    
    // เริ่มการทำงานของ Swiper (เรียกใช้ Library Global ที่โหลดใน index.html)
    if (typeof Swiper !== 'undefined') {
        heroSwiperInstance = new Swiper(`#${containerId}`, {
            loop: banners.length > 1, 
            autoplay: { delay: 4000, disableOnInteraction: false },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            pagination: { el: '.swiper-pagination', clickable: true }, 
            slidesPerView: 1, 
            observer: true, 
            observeParents: true
        });
    } else {
        console.warn('Swiper library not found');
    }
}
