// js/pages/home.js
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, collection, query, limit, orderBy, where, getDocs } from "firebase/firestore";

import { db, auth, appId } from "../config/db-config.js";
import { setupSearchSystem } from "../modules/search.js";
import { loadNavbar } from "../modules/navbar.js";

import { renderHeroBanner, renderHeroSkeleton } from "../modules/hero-banner.js";
import { renderTop10Section } from "../modules/top10.js";
import { renderHistorySectionHTML } from "../modules/history-section.js";
import { renderRecommendedSection } from "../modules/recommended.js";
import { renderThaiDubSection } from "../modules/thai-dub.js";
import { renderLatestUpdatesSection } from "../modules/latest-updates.js";

import { initGlobalErrorLogging } from "../modules/logger.js";
import { observeImages } from "../utils/tools.js";

let userId;
let historyItems = []; 
let allBanners = []; 
let historyUnsubscribe = null; 
let isSearchInitialized = false; 

let top30Shows = [];
let thaiDubShows = [];
let latestShows = [];

let sectionsContainer;

function initializeFirebase() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;

            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('search')) {
                const query = urlParams.get('search');
                if(query) {
                    window.location.replace(`pages/grid.html?search=${encodeURIComponent(query)}`);
                    return; 
                }
            }

            if (!isSearchInitialized) {
                setupSearchSystem(historyItems);
                isSearchInitialized = true;
            }
            setupHistoryListener();
        } else {
            userId = null;
            historyItems = [];
                if (!isSearchInitialized) {
                setupSearchSystem([]);
                isSearchInitialized = true;
            }
            updateHistorySectionOnly();
        }
        
        await setupOptimizedDataFetch(); 
    });
}

function getCollectionRef(collectionName) {
    return collection(db, `artifacts/${appId}/public/data/${collectionName}`);
}

function getHistoryCollectionRef() {
        return collection(db, `artifacts/${appId}/users/${userId}/viewHistory`);
}

function renderSkeletons() {
    renderHeroSkeleton('hero-swiper');
    if (sectionsContainer) {
        let html = '';
        for(let i=0; i<3; i++) {
            html += `
                <div class="mb-8">
                    <div class="h-8 w-48 bg-gray-800 skeleton mb-4 rounded"></div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        ${Array(6).fill(0).map(() => `<div class="aspect-[2/3] bg-gray-800 skeleton rounded-lg"></div>`).join('')}
                    </div>
                </div>
            `;
        }
        sectionsContainer.innerHTML = html;
    }
}

async function setupOptimizedDataFetch() {
    try {
        if (allBanners.length === 0 && top30Shows.length === 0) renderSkeletons();

        const showsRef = getCollectionRef("shows");
        const bannerRef = getCollectionRef("banners");

        const top30Query = query(showsRef, orderBy("viewCount", "desc"), limit(30));
        const thaiDubQuery = query(showsRef, where("tags", "array-contains", "อนิเมะพากย์ไทย"), limit(15));
        const latestQuery = query(showsRef, orderBy("latestEpisodeUpdateAt", "desc"), limit(15));
        const bannerQuery = query(bannerRef, orderBy("updatedAt", "desc"), limit(10));

        const results = await Promise.allSettled([
            getDocs(top30Query), 
            getDocs(thaiDubQuery), 
            getDocs(latestQuery), 
            getDocs(bannerQuery)
        ]);

        const getData = (result, name) => {
            if (result.status === 'fulfilled') {
                return result.value.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                console.warn(`⚠️ Failed to load ${name}:`, result.reason);
                return [];
            }
        };

        top30Shows = getData(results[0], 'Top 30');
        thaiDubShows = getData(results[1], 'Thai Dub');
        latestShows = getData(results[2], 'Latest Updates');
        allBanners = getData(results[3], 'Banners');

        renderHeroBanner('hero-swiper', allBanners, historyItems, userId);
        renderOptimizedSections(top30Shows, thaiDubShows, latestShows);

    } catch (error) {
        console.error("Critical Error fetching data:", error);
        if(sectionsContainer) sectionsContainer.innerHTML = `<p class="text-center text-red-500 py-10">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</p>`;
    }
}

// ฟังก์ชัน Render ประวัติ (ปรับปรุงให้รองรับ Scroll)
function renderHistorySection() {
    const htmlContent = renderHistorySectionHTML(historyItems, userId);
    
    const container = document.getElementById('main-history-container');
    if (container) {
        container.innerHTML = `
            <div class="h-full flex flex-col">
                <div class="flex-1 overflow-y-auto custom-scrollbar-y pr-1">
                    ${htmlContent}
                </div>
            </div>
        `;
    }
}

function updateHistorySectionOnly() {
    if (allBanners.length > 0) renderHeroBanner('hero-swiper', allBanners, historyItems, userId);
    renderHistorySection();
}

function setupHistoryListener() {
    if (!userId) return;
    if (historyUnsubscribe) historyUnsubscribe();

    const historyQuery = query(getHistoryCollectionRef(), orderBy("watchedAt", "desc"), limit(10));
    historyUnsubscribe = onSnapshot(historyQuery, (snapshot) => {
        historyItems.length = 0; 
        snapshot.forEach((doc) => {
            historyItems.push({ id: doc.id, ...doc.data() });
        });
        updateHistorySectionOnly();
    });
}

function renderOptimizedSections(top30Shows, thaiDubShows, latestShows) {
    if (!sectionsContainer) return;
    sectionsContainer.innerHTML = ''; 

    // 1. Top 10 (Full Width)
    const top10Element = renderTop10Section(top30Shows, historyItems);
    if (top10Element) {
        sectionsContainer.appendChild(top10Element);
    }
    
    // 2. Recommended
    const recommendedEl = renderRecommendedSection(top30Shows, historyItems);
    if (recommendedEl) sectionsContainer.appendChild(recommendedEl);

    // 3. Thai Dub
    const thaiDubEl = renderThaiDubSection(thaiDubShows, historyItems);
    if (thaiDubEl) sectionsContainer.appendChild(thaiDubEl);

    // 4. Latest
    const latestEl = renderLatestUpdatesSection(latestShows, historyItems);
    if (latestEl) sectionsContainer.appendChild(latestEl);
    
    if(top30Shows.length === 0 && latestShows.length === 0) { 
        sectionsContainer.innerHTML = `<p class="text-center text-gray-400 py-10">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</p>`;
    }

    observeImages(sectionsContainer);
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadNavbar('.'); // Path for root
    sectionsContainer = document.getElementById('sections-container');
    initializeFirebase(); 
});
