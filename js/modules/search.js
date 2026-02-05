import { collection, query, where, getDocs, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ✅ เปลี่ยนชื่อไฟล์ Import เป็นชื่อใหม่
import { db, appId } from "../config/db-config.js"; 
import { generateSearchTerms, debounce } from "../utils/tools.js"; 

export function setupSearchSystem(historyItems = [], limitCount = 5) {
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileSearchDropdown = document.getElementById('mobile-search-dropdown');

    const getPaths = () => {
        const isPages = window.location.pathname.includes('/pages/');
        return {
            player: isPages ? 'player.html' : 'pages/player.html',
            grid: isPages ? 'grid.html' : 'pages/grid.html'
        };
    };

    const performSearch = async (term, dropdownElement) => {
        if (!term || term.length < 2) {
            dropdownElement.classList.add('hidden');
            dropdownElement.innerHTML = '';
            return;
        }

        dropdownElement.innerHTML = `<div class="p-4 text-center text-gray-400"><i class="ri-loader-4-line animate-spin"></i> กำลังค้นหา...</div>`;
        dropdownElement.classList.remove('hidden');

        try {
            const searchTerms = generateSearchTerms(term);
            const showsRef = collection(db, `artifacts/${appId}/public/data/shows`);
            const promises = searchTerms.map(t => 
                getDocs(query(showsRef, where("keywords", "array-contains", t), limit(limitCount)))
            );

            const snapshots = await Promise.all(promises);
            const results = new Map();
            snapshots.forEach(snap => {
                snap.forEach(doc => {
                    if (!results.has(doc.id)) results.set(doc.id, { id: doc.id, ...doc.data() });
                });
            });

            const uniqueResults = Array.from(results.values()).slice(0, limitCount); 
            renderDropdown(uniqueResults, dropdownElement, historyItems);

        } catch (error) {
            console.error("Search Error:", error);
            dropdownElement.innerHTML = `<div class="p-3 text-center text-red-400 text-sm">เกิดข้อผิดพลาด</div>`;
        }
    };

    const renderDropdown = (results, dropdown, history) => {
        if (results.length === 0) {
            dropdown.innerHTML = `<div class="p-3 text-center text-gray-500 text-sm">ไม่พบข้อมูล</div>`;
            return;
        }

        const paths = getPaths();
        let html = '';
        results.forEach(show => {
            const historyItem = history.find(h => h.showId === show.id);
            const link = historyItem && historyItem.lastWatchedEpisodeId 
                ? `${paths.player}?id=${show.id}&ep_id=${historyItem.lastWatchedEpisodeId}` 
                : `${paths.player}?id=${show.id}`;
            
            const watchedBadge = historyItem 
                ? `<span class="text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded ml-2">เคยดู</span>` 
                : '';

            html += `
                <a href="${link}" class="search-dropdown-item block p-3 border-b border-gray-700 last:border-0 flex items-center gap-3 transition-colors">
                    <img src="${show.thumbnailUrl}" class="w-10 h-14 object-cover rounded bg-gray-700 flex-shrink-0" onerror="this.src='https://placehold.co/40x60?text=?'">
                    <div class="min-w-0">
                        <h4 class="text-sm font-bold text-white truncate">${show.title} ${watchedBadge}</h4>
                        <p class="text-xs text-gray-400 truncate">ตอนที่ ${show.latestEpisodeNumber || 0}</p>
                    </div>
                </a>
            `;
        });
        
        const searchTerm = searchInput ? searchInput.value : (mobileSearchInput ? mobileSearchInput.value : '');
        html += `
            <a href="${paths.grid}?search=${encodeURIComponent(searchTerm)}" class="block p-3 text-center text-sm text-green-400 hover:text-green-300 bg-gray-800 hover:bg-gray-700 font-medium transition-colors">
                ดูผลการค้นหาทั้งหมด (${results.length}+)
            </a>
        `;

        dropdown.innerHTML = html;
    };

    const onSearch = debounce((e, dropdown) => performSearch(e.target.value, dropdown), 400);
    
    const handleEnter = (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            const paths = getPaths();
            window.location.href = `${paths.grid}?search=${encodeURIComponent(e.target.value.trim())}`;
        }
    };

    if (searchInput && searchDropdown) {
        searchInput.addEventListener('input', (e) => onSearch(e, searchDropdown));
        searchInput.addEventListener('focus', (e) => { if(e.target.value) searchDropdown.classList.remove('hidden'); });
        searchInput.addEventListener('keyup', handleEnter);
    }

    if (mobileSearchInput && mobileSearchDropdown) {
        mobileSearchInput.addEventListener('input', (e) => onSearch(e, mobileSearchDropdown));
        mobileSearchInput.addEventListener('keyup', handleEnter);
    }

    document.addEventListener('click', (e) => {
        if (searchInput && searchDropdown) {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.add('hidden');
            }
        }
        if (mobileSearchInput && mobileSearchDropdown) {
            if (!mobileSearchInput.contains(e.target) && !mobileSearchDropdown.contains(e.target)) {
                mobileSearchDropdown.classList.add('hidden');
            }
        }
    });
}
