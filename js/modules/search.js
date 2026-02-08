import { debounce } from "../utils/tools.js";
import { loadSearchIndex, searchAnime } from "../services/search-index.js";

// เริ่มโหลดข้อมูลเก็บลงเครื่องทันที (ทำงานเบื้องหลัง)
loadSearchIndex();

export function setupSearchSystem() {
    setupInput('search-input', 'search-dropdown');
    setupInput('mobile-search-input', 'mobile-search-dropdown');
}

function setupInput(inputId, dropdownId) {
    const searchInput = document.getElementById(inputId);
    const searchDropdown = document.getElementById(dropdownId);

    if (!searchInput || !searchDropdown) return;

    // ฟังก์ชันค้นหา
    const performSearch = debounce((query) => {
        if (!query || query.length < 2) { 
            searchDropdown.classList.add('hidden');
            return;
        }

        // ค้นหาข้อมูล (ดึงมาสูงสุด 6 เรื่อง)
        const results = searchAnime(query).slice(0, 6);

        // วาดผลลัพธ์ลงหน้าจอ
        renderDropdown(results, searchDropdown, query);

    }, 200); // Delay นิดนึงกันเครื่องกระตุกเวลาพิมพ์เร็วๆ

    // Events ต่างๆ
    searchInput.addEventListener('input', (e) => performSearch(e.target.value.trim()));
    
    searchInput.addEventListener('focus', () => {
        if(searchInput.value.trim().length >= 2) searchDropdown.classList.remove('hidden');
    });

    // คลิกข้างนอกเพื่อปิด
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });
    
    // กด Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const val = e.target.value.trim();
            if (val) window.location.href = `pages/grid.html?search=${encodeURIComponent(val)}`;
        }
    });
}

// 🎨 ฟังก์ชันวาดหน้าตา DropDown ระดับมืออาชีพ
function renderDropdown(results, container, queryText) {
    // ล้าง Style เดิมและใส่ Style ใหม่ให้ Container
    // ใช้สีพื้นหลังเข้มและ Border บางๆ เพื่อความทันสมัย
    container.className = "absolute left-0 right-0 mt-2 w-full bg-[#1a1c22] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden hidden";

    if (results.length === 0) {
        container.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-sm text-gray-400">ไม่พบผลลัพธ์สำหรับ "<span class="text-white">${queryText}</span>"</p>
            </div>`;
    } else {
        const listHtml = results.map(item => {
            // เช็คว่ามีรูปหรือไม่ ถ้าไม่มีใช้รูป Default
            const poster = item.posterUrl && item.posterUrl.trim() !== '' 
                           ? item.posterUrl 
                           : 'https://placehold.co/40x60/333/999?text=No+Img';

            return `
            <a href="pages/player.html?id=${item.id}" 
               class="flex items-center gap-3 p-3 border-b border-gray-800 hover:bg-[#252830] transition-colors group">
                
                <div class="relative flex-shrink-0 w-10 h-14 overflow-hidden rounded bg-gray-800 shadow-lg">
                    <img src="${poster}" 
                         alt="${item.title}"
                         class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                         loading="lazy"
                         onerror="this.src='https://placehold.co/40x60/333/999?text=Error'">
                </div>
                
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-gray-200 truncate group-hover:text-green-400 transition-colors">
                        ${highlightMatch(item.title, queryText)}
                    </h4>
                    <div class="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span class="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700/50">${item.type || 'TV'}</span>
                        <span>${item.releaseYear || '-'}</span>
                        ${item.rating ? `<span class="flex items-center text-yellow-500"><i class="ri-star-fill mr-0.5"></i>${parseFloat(item.rating).toFixed(1)}</span>` : ''}
                    </div>
                </div>

                <i class="ri-arrow-right-s-line text-gray-600 group-hover:text-white transition-colors"></i>
            </a>
            `;
        }).join('');

        const viewAllHtml = `
            <a href="pages/grid.html?search=${encodeURIComponent(queryText)}" 
               class="block py-3 text-center text-xs font-bold text-green-400 bg-[#16181d] hover:bg-gray-800 transition-colors hover:text-green-300 uppercase tracking-wider">
                ดูผลการค้นหาทั้งหมด
            </a>
        `;

        container.innerHTML = listHtml + viewAllHtml;
    }
    
    container.classList.remove('hidden');
}

// ฟังก์ชันไฮไลท์คำที่ตรง
function highlightMatch(text, query) {
    if (!query) return text;
    try {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="text-green-400 font-bold">$1</span>');
    } catch (e) { return text; }
}
