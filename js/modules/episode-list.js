import { collection, query, where, orderBy, getDocs, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, appId } from "../config/db-config.js";

const EPISODES_PER_BATCH = 50; // ✅ กำหนดค่าคงที่ไว้ที่นี่ที่เดียว
let currentShowId = null;
let currentEpisodes = []; 
let activeEpisodeId = null; 

// ฟังก์ชันหลักสำหรับโหลดและจัดการ List (เรียกครั้งแรก)
export async function initEpisodeList(showId, latestEpisodeNumber, onEpisodeSelect) {
    currentShowId = showId;
    const container = document.getElementById('episode-list-container');
    const rangeContainer = document.getElementById('episode-range-container');
    const rangeSelect = document.getElementById('episode-range-select');

    // สร้าง Dropdown เลือกช่วงตอน
    setupRangeSelector(latestEpisodeNumber, rangeSelect, rangeContainer, async (start, end) => {
        await loadEpisodesByRange(start, end, container, onEpisodeSelect);
    });

    if (!latestEpisodeNumber || latestEpisodeNumber === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">ยังไม่มีตอน</p>';
        return;
    }
}

// Helper: สร้าง Dropdown
function setupRangeSelector(totalEpisodes, selectEl, containerEl, loadCallback) {
    const effectiveTotal = totalEpisodes || 0;
    
    if (effectiveTotal === 0) {
        containerEl.classList.add('hidden');
        return;
    }

    const totalRanges = Math.ceil(effectiveTotal / EPISODES_PER_BATCH);
    let html = '';
    
    for (let i = 0; i < totalRanges; i++) {
        const start = (i * EPISODES_PER_BATCH) + 1;
        const end = Math.min((i + 1) * EPISODES_PER_BATCH, effectiveTotal);
        html += `<option value="${start}-${end}">ตอนที่ ${start} - ${end}</option>`;
    }

    if (totalRanges === 0) html = '<option value="">ไม่มีตอน</option>';
    
    selectEl.innerHTML = html;
    containerEl.classList.remove('hidden');

    // Event Listener เปลี่ยนช่วง
    selectEl.onchange = (e) => {
        if(!e.target.value) return;
        const [start, end] = e.target.value.split('-').map(Number);
        loadCallback(start, end);
    };
}

// โหลดตอนจาก Firestore ตามช่วง
export async function loadEpisodesByRange(start, end, container, onEpisodeSelect) {
    container.innerHTML = '<p class="text-gray-400 p-2 text-sm">กำลังโหลด...</p>';
    
    try {
        const q = query(
            collection(db, `artifacts/${appId}/public/data/episodes`),
            where("showId", "==", currentShowId),
            where("number", ">=", start),
            where("number", "<=", end),
            orderBy("number", "asc")
        );
        
        const snapshot = await getDocs(q);
        currentEpisodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderButtons(currentEpisodes, container, onEpisodeSelect);
        return currentEpisodes;

    } catch (error) {
        console.error("Load episodes error:", error);
        container.innerHTML = `<p class="text-red-500 text-sm">โหลดข้อมูลล้มเหลว</p>`;
        return [];
    }
}

// วาดปุ่มตอน
function renderButtons(episodes, container, onClick) {
    container.innerHTML = '';
    if (episodes.length === 0) {
        container.innerHTML = '<p class="text-gray-400 p-4 text-sm w-full text-center">ไม่พบตอนในช่วงนี้</p>';
        return;
    }

    episodes.forEach(ep => {
        const btn = document.createElement('button');
        
        // เช็ค Active State ทันทีตอนสร้าง
        let activeClass = '';
        if (ep.id === activeEpisodeId) {
            activeClass = 'active bg-green-600 text-white';
        }
        
        btn.className = `ep-button w-12 h-12 flex-shrink-0 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center font-medium transition-colors duration-200 text-sm ${getStatusClass(ep.status)} ${activeClass}`;
        btn.textContent = ep.number;
        btn.dataset.id = ep.id;
        btn.onclick = () => onClick(ep);
        container.appendChild(btn);

        // Scroll into view if active
        if (ep.id === activeEpisodeId) {
             setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 100);
        }
    });
}

function getStatusClass(status) {
    if (status === 'broken' || status === 'user_reported') return 'border-2 border-red-500 bg-red-900/30 text-red-300';
    return '';
}

// ไฮไลท์ปุ่มตอนที่กำลังเล่น
export function highlightActiveEpisode(episodeId) {
    activeEpisodeId = episodeId; // จำค่าไว้
    
    document.querySelectorAll('.ep-button').forEach(btn => {
        if (btn.dataset.id === episodeId) {
            btn.classList.add('active', 'bg-green-600', 'text-white');
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            btn.classList.remove('active', 'bg-green-600', 'text-white');
        }
    });
}

// ฟังก์ชันหาตอนถัดไป/ก่อนหน้า
export async function findNextPrevEpisode(currentNum, direction, showData) {
    const targetNum = direction === 'next' ? currentNum + 1 : currentNum - 1;
    if (targetNum < 1) return null;

    // 1. หาใน Cache ปัจจุบันก่อน
    const cached = currentEpisodes.find(ep => ep.number === targetNum);
    if (cached) return cached;

    // 2. ถ้าไม่มีใน Cache ให้โหลดจาก Server (เฉพาะตอนนั้น)
    const q = query(
        collection(db, `artifacts/${appId}/public/data/episodes`),
        where("showId", "==", currentShowId),
        where("number", "==", targetNum),
        limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    
    return null;
}

// อัปเดต Dropdown ให้ตรงกับตอนที่เล่นอยู่
export function syncRangeSelector(episodeNum) {
    const rangeSelect = document.getElementById('episode-range-select');
    if (!rangeSelect) return;
    
    for (let option of rangeSelect.options) {
        const [start, end] = option.value.split('-').map(Number);
        if (episodeNum >= start && episodeNum <= end) {
            if (rangeSelect.value !== option.value) {
                rangeSelect.value = option.value;
                // ไม่ต้อง dispatchEvent เพื่อป้องกันการโหลดซ้ำซ้อน
            }
            return;
        }
    }
}

// ✅ ฟังก์ชันใหม่: ตรวจสอบและโหลด Batch อัตโนมัติ (Encapsulation Logic)
export async function checkAndLoadEpisodeBatch(episodeNumber, onEpisodeSelect) {
    const container = document.getElementById('episode-list-container');
    if (!container) return;

    // คำนวณหาช่วงของตอนนั้นๆ
    const rangeStart = Math.floor((episodeNumber - 1) / EPISODES_PER_BATCH) * EPISODES_PER_BATCH + 1;
    const rangeEnd = rangeStart + EPISODES_PER_BATCH - 1;

    // เช็คว่าปุ่มของตอนนั้นมีอยู่ใน DOM หรือยัง
    const existingButton = Array.from(container.children).find(btn => btn.textContent == episodeNumber);
    
    if (!existingButton) {
        // ถ้ายังไม่มีปุ่ม (แสดงว่าข้าม Batch หรือยังไม่โหลด) ให้โหลดใหม่
        await loadEpisodesByRange(rangeStart, rangeEnd, container, onEpisodeSelect);
        // อัปเดต Dropdown ให้ตรงกันด้วย
        syncRangeSelector(episodeNumber);
    }
}
