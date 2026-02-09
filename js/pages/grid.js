// js/pages/grid.js
import { loadNavbar } from "../modules/navbar.js";
import { createAnimeCard } from "../modules/card.js";
import { observeImages } from "../utils/tools.js";
import { searchAnime, loadSearchIndex } from "../services/search-index.js";
import { setupSearchSystem } from "../modules/search.js"; 
import { db, appId } from "../config/db-config.js";
import { collection, query, orderBy, limit, getDocs, where, startAfter } from "firebase/firestore";

// --- State Management ---
const ITEMS_PER_PAGE = 24;
let currentMode = 'latest'; 
let currentTag = '';
let lastDoc = null; 

let searchResultsBuffer = []; 
let currentSearchPage = 0;

let hasMore = true;
let isLoading = false;

// UI Elements
let gridContainer, loadMoreBtn, noResults, pageTitle, resultCount, clearBtn, scrollToTopBtn;

// --- Initialization ---
async function initPage() {
    gridContainer = document.getElementById('anime-grid');
    loadMoreBtn = document.getElementById('load-more-btn');
    noResults = document.getElementById('no-results');
    pageTitle = document.getElementById('page-title');
    resultCount = document.getElementById('result-count');
    clearBtn = document.getElementById('clear-search-btn');
    scrollToTopBtn = document.getElementById('scroll-to-top');

    // Bind Events
    loadMoreBtn.addEventListener('click', handleLoadMore);
    scrollToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('scroll', () => {
        scrollToTopBtn.classList.toggle('visible', window.scrollY > 300);
    });

    await loadNavbar('../');
    setupSearchSystem(); 

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const tagQuery = urlParams.get('tag');

    // Reset UI
    gridContainer.innerHTML = ''; 
    loadMoreBtn.classList.add('hidden');
    renderSkeletons();

    if (searchQuery) {
        currentMode = 'search';
        await handleSearchMode(searchQuery);
    } else if (tagQuery) {
        currentMode = 'tag';
        currentTag = decodeURIComponent(tagQuery);
        await handleTagMode(currentTag);
    } else {
        currentMode = 'latest';
        await handleLatestMode();
    }
}

// --- Mode 1: Search ---
async function handleSearchMode(term) {
    pageTitle.innerHTML = `ผลการค้นหา: "<span class="text-green-400">${term}</span>"`;
    clearBtn.classList.remove('hidden');
    resultCount.textContent = "กำลังค้นหาข้อมูล...";

    try {
        await loadSearchIndex(); 
        searchResultsBuffer = searchAnime(term); 
        
        resultCount.textContent = `พบทั้งหมด ${searchResultsBuffer.length} เรื่อง`;
        
        if (searchResultsBuffer.length === 0) {
            showNoResults();
        } else {
            renderSearchBatch(); 
        }
    } catch (error) {
        console.error("Search Error:", error);
        showError();
    }
}

function renderSearchBatch() {
    const start = currentSearchPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const batch = searchResultsBuffer.slice(start, end);

    renderCards(batch);

    if (end >= searchResultsBuffer.length) {
        hasMore = false;
        loadMoreBtn.classList.add('hidden');
    } else {
        hasMore = true;
        currentSearchPage++;
        loadMoreBtn.classList.remove('hidden');
    }
}

// --- Mode 2: Tag Filter ---
async function handleTagMode(tag) {
    pageTitle.innerText = `หมวดหมู่: ${tag}`;
    clearBtn.classList.add('hidden');
    await fetchFirebaseData(
        query(
            collection(db, `artifacts/${appId}/public/data/shows`),
            where("tags", "array-contains", tag),
            orderBy("updatedAt", "desc"),
            limit(ITEMS_PER_PAGE)
        )
    );
}

// --- Mode 3: Latest Updates ---
async function handleLatestMode() {
    pageTitle.innerText = "อัปเดตล่าสุด";
    clearBtn.classList.add('hidden');
    await fetchFirebaseData(
        query(
            collection(db, `artifacts/${appId}/public/data/shows`),
            orderBy("updatedAt", "desc"),
            limit(ITEMS_PER_PAGE)
        )
    );
}

// --- Shared Firebase Fetcher ---
async function fetchFirebaseData(q) {
    if (isLoading) return;
    isLoading = true;
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerText = "กำลังโหลด...";

    try {
        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (items.length > 0) {
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            renderCards(items);
            
            if (items.length < ITEMS_PER_PAGE) {
                hasMore = false;
                loadMoreBtn.classList.add('hidden');
            } else {
                hasMore = true;
                loadMoreBtn.classList.remove('hidden');
            }
            
            if (currentMode === 'tag' || currentMode === 'latest') {
                resultCount.textContent = `แสดงรายการที่โหลดแล้ว ${gridContainer.children.length} เรื่อง`;
            }

        } else {
            hasMore = false;
            loadMoreBtn.classList.add('hidden');
            if (gridContainer.children.length === 0) showNoResults();
        }

    } catch (error) {
        console.error("Firebase Error:", error);
        showError();
    } finally {
        isLoading = false;
        loadMoreBtn.disabled = false;
        loadMoreBtn.innerText = "โหลดเพิ่มเติม";
        const skeletons = gridContainer.querySelectorAll('.skeleton');
        skeletons.forEach(el => el.remove());
    }
}

// --- UI Helpers ---
function renderCards(items) {
    if (gridContainer.querySelector('.skeleton')) {
        gridContainer.innerHTML = '';
    }

    const html = items.map(show => createAnimeCard(show)).join('');
    gridContainer.insertAdjacentHTML('beforeend', html);
    observeImages(gridContainer);
}

function renderSkeletons() {
    let html = '';
    for(let i=0; i<12; i++) {
        html += `<div class="aspect-[2/3] rounded-xl skeleton"></div>`;
    }
    gridContainer.innerHTML = html;
}

function showNoResults() {
    gridContainer.classList.add('hidden');
    noResults.classList.remove('hidden');
    loadMoreBtn.classList.add('hidden');
    const skeletons = gridContainer.querySelectorAll('.skeleton');
    skeletons.forEach(el => el.remove());
}

function showError() {
    gridContainer.innerHTML = `<p class="col-span-full text-center text-red-400 py-10">เกิดข้อผิดพลาดในการโหลดข้อมูล โปรดลองใหม่</p>`;
}

// --- Event Handlers ---
function handleLoadMore() {
    if (currentMode === 'search') {
        renderSearchBatch();
    } else if (currentMode === 'tag') {
        const q = query(
            collection(db, `artifacts/${appId}/public/data/shows`),
            where("tags", "array-contains", currentTag),
            orderBy("updatedAt", "desc"),
            limit(ITEMS_PER_PAGE)
        );
        fetchFirebaseData(q);
    } else {
        const q = query(
            collection(db, `artifacts/${appId}/public/data/shows`),
            orderBy("updatedAt", "desc"),
            limit(ITEMS_PER_PAGE)
        );
        fetchFirebaseData(q);
    }
}

document.addEventListener('DOMContentLoaded', initPage);
