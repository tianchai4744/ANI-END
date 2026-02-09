// js/modules/episode-list.js
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

// --- 🧠 SERVICE LAYER (สมอง: จัดการข้อมูล) ---
const EpisodeService = {
    currentShowId: null,
    cache: [], // เก็บ Cache ไว้ลดการโหลดซ้ำ

    init(showId) {
        this.currentShowId = showId;
        this.cache = [];
    },

    async fetchByRange(start, end) {
        if (!this.currentShowId) return [];
        try {
            const q = query(
                collection(db, `artifacts/${appId}/public/data/episodes`),
                where("showId", "==", this.currentShowId),
                where("number", ">=", start),
                where("number", "<=", end),
                orderBy("number", "asc")
            );
            const snapshot = await getDocs(q);
            const episodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // เก็บลง Cache (เผื่ออนาคตอยากใช้)
            this.cache = [...this.cache, ...episodes];
            return episodes;
        } catch (error) {
            console.error("Service Error:", error);
            throw error;
        }
    },

    async findSingleEpisode(targetNum) {
        // 1. หาใน Cache ก่อน
        const cached = this.cache.find(ep => ep.number === targetNum);
        if (cached) return cached;

        // 2. ถ้าไม่มี ให้ดึงจาก Server
        const q = query(
            collection(db, `artifacts/${appId}/public/data/episodes`),
            where("showId", "==", this.currentShowId),
            where("number", "==", targetNum),
            limit(1)
        );
        const snap = await getDocs(q);
        return !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
    }
};

// --- 🎨 UI LAYER (หน้าตา: วาด HTML) ---
const EpisodeUI = {
    container: null,
    rangeSelect: null,
    rangeContainer: null,
    activeEpisodeId: null,

    init() {
        this.container = document.getElementById('episode-list-container');
        this.rangeContainer = document.getElementById('episode-range-container');
        this.rangeSelect = document.getElementById('episode-range-select');
    },

    renderLoading() {
        if(this.container) this.container.innerHTML = '<p class="text-gray-400 p-2 text-sm">กำลังโหลด...</p>';
    },

    renderError() {
        if(this.container) this.container.innerHTML = `<p class="text-red-500 text-sm">โหลดข้อมูลล้มเหลว</p>`;
    },

    renderEmpty() {
        if(this.container) this.container.innerHTML = '<p class="text-gray-500 text-sm">ยังไม่มีตอน</p>';
    },

    setupRangeSelector(totalEpisodes, onRangeChange) {
        const effectiveTotal = totalEpisodes || 0;
        if (effectiveTotal === 0 || !this.rangeContainer) {
            if(this.rangeContainer) this.rangeContainer.classList.add('hidden');
            return;
        }

        const EPISODES_PER_BATCH = 50;
        const totalRanges = Math.ceil(effectiveTotal / EPISODES_PER_BATCH);
        let html = '';

        for (let i = 0; i < totalRanges; i++) {
            const start = (i * EPISODES_PER_BATCH) + 1;
            const end = Math.min((i + 1) * EPISODES_PER_BATCH, effectiveTotal);
            html += `<option value="${start}-${end}">ตอนที่ ${start} - ${end}</option>`;
        }

        if (totalRanges === 0) html = '<option value="">ไม่มีตอน</option>';

        this.rangeSelect.innerHTML = html;
        this.rangeContainer.classList.remove('hidden');

        // Bind Event
        this.rangeSelect.onchange = (e) => {
            if (!e.target.value) return;
            const [start, end] = e.target.value.split('-').map(Number);
            onRangeChange(start, end);
        };
    },

    updateRangeSelector(episodeNum) {
        if (!this.rangeSelect) return;
        for (let option of this.rangeSelect.options) {
            const [start, end] = option.value.split('-').map(Number);
            if (episodeNum >= start && episodeNum <= end) {
                if (this.rangeSelect.value !== option.value) {
                    this.rangeSelect.value = option.value;
                }
                return;
            }
        }
    },

    renderButtons(episodes, onSelect) {
        if (!this.container) return;
        this.container.innerHTML = '';
        
        if (episodes.length === 0) {
            this.container.innerHTML = '<p class="text-gray-400 p-4 text-sm w-full text-center">ไม่พบตอนในช่วงนี้</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        episodes.forEach(ep => {
            const btn = document.createElement('button');
            const isActive = ep.id === this.activeEpisodeId;
            
            btn.className = `ep-button w-12 h-12 flex-shrink-0 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center font-medium transition-colors duration-200 text-sm ${this._getStatusClass(ep.status)} ${isActive ? 'active bg-green-600 text-white' : ''}`;
            btn.textContent = ep.number;
            btn.dataset.id = ep.id;
            btn.onclick = () => onSelect(ep);
            
            fragment.appendChild(btn);
        });
        
        this.container.appendChild(fragment);
        this.scrollToActive();
    },

    highlightActive(episodeId) {
        this.activeEpisodeId = episodeId;
        document.querySelectorAll('.ep-button').forEach(btn => {
            if (btn.dataset.id === episodeId) {
                btn.classList.add('active', 'bg-green-600', 'text-white');
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                btn.classList.remove('active', 'bg-green-600', 'text-white');
            }
        });
    },

    scrollToActive() {
        setTimeout(() => {
            const activeBtn = this.container.querySelector('.ep-button.active');
            if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
    },

    hasButtonFor(episodeNum) {
        if (!this.container) return false;
        return Array.from(this.container.children).some(btn => btn.textContent == episodeNum);
    },

    _getStatusClass(status) {
        if (status === 'broken' || status === 'user_reported') return 'border-2 border-red-500 bg-red-900/30 text-red-300';
        return '';
    }
};

// --- 🎮 CONTROLLER (ตัวเชื่อม: Export ให้ภายนอกใช้) ---

export async function initEpisodeList(showId, latestEpisodeNumber, onEpisodeSelect) {
    EpisodeService.init(showId);
    EpisodeUI.init();

    if (!latestEpisodeNumber || latestEpisodeNumber === 0) {
        EpisodeUI.renderEmpty();
        return;
    }

    EpisodeUI.setupRangeSelector(latestEpisodeNumber, async (start, end) => {
        await loadEpisodesByRange(start, end, null, onEpisodeSelect);
    });
}

export async function loadEpisodesByRange(start, end, _unusedContainer, onEpisodeSelect) {
    EpisodeUI.renderLoading();
    try {
        const episodes = await EpisodeService.fetchByRange(start, end);
        EpisodeUI.renderButtons(episodes, onEpisodeSelect);
        return episodes;
    } catch (e) {
        EpisodeUI.renderError();
        return [];
    }
}

export function highlightActiveEpisode(episodeId) {
    EpisodeUI.highlightActive(episodeId);
}

export async function findNextPrevEpisode(currentNum, direction, _unusedShowData) {
    const targetNum = direction === 'next' ? currentNum + 1 : currentNum - 1;
    if (targetNum < 1) return null;
    return await EpisodeService.findSingleEpisode(targetNum);
}

export async function checkAndLoadEpisodeBatch(episodeNumber, onEpisodeSelect) {
    const EPISODES_PER_BATCH = 50;
    const rangeStart = Math.floor((episodeNumber - 1) / EPISODES_PER_BATCH) * EPISODES_PER_BATCH + 1;
    const rangeEnd = rangeStart + EPISODES_PER_BATCH - 1;

    if (!EpisodeUI.hasButtonFor(episodeNumber)) {
        await loadEpisodesByRange(rangeStart, rangeEnd, null, onEpisodeSelect);
        EpisodeUI.updateRangeSelector(episodeNumber);
    }
}
