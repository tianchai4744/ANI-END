import { debounce } from "../utils/tools.js";
import { loadSearchIndex, searchAnime } from "../services/search-index.js";

// เริ่มโหลดข้อมูลเก็บลงเครื่องทันที (ทำงานเบื้องหลัง)
loadSearchIndex();

export function setupSearchSystem() {
    // ตั้งค่าช่องค้นหา Desktop
    setupInput('search-input', 'search-dropdown');
    
    // ตั้งค่าช่องค้นหา Mobile
    setupInput('mobile-search-input', 'mobile-search-dropdown');
}

function setupInput(inputId, dropdownId) {
    const searchInput = document.getElementById(inputId);
    const searchDropdown = document.getElementById(dropdownId);

    if (!searchInput || !searchDropdown) return;

    // ฟังก์ชันค้นหาและแสดง DropDown
    const performSearch = debounce((query) => {
        // 1. ถ้าช่องว่าง หรือพิมพ์น้อยกว่า 2 ตัว ให้ซ่อน DropDown
        if (!query || query.length < 2) { 
            searchDropdown.classList.add('hidden');
            return;
        }

        // 2. ค้นหาข้อมูลจากในเครื่อง (ไม่เสีย Read)
        const results = searchAnime(query).slice(0, 6); // เอาแค่ 6 อันดับแรกให้ DropDown ไม่ยาวเกิน

        // 3. วาด DropDown
        renderDropdown(results, searchDropdown, query);

    }, 100); // ดีเลย์นิดเดียวพอ เพราะค้นหาในเครื่องเร็วมาก

    // Event: เมื่อพิมพ์
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value.trim());
    });

    // Event: เมื่อคลิกที่ช่องค้นหา (ถ้ามีข้อความค้างอยู่ ให้แสดง DropDown เดิม)
    searchInput.addEventListener('focus', () => {
        if(searchInput.value.trim().length >= 2) {
             searchDropdown.classList.remove('hidden');
        }
    });

    // Event: คลิกข้างนอกเพื่อปิด DropDown
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });
    
    // Event: กด Enter เพื่อไปหน้าผลลัพธ์รวม
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const val = e.target.value.trim();
            if (val) window.location.href = `pages/grid.html?search=${encodeURIComponent(val)}`;
        }
    });
}

// 🎨 ฟังก์ชันวาดหน้าตา DropDown (ส่วนสำคัญที่ทำให้ดู Pro)
function renderDropdown(results, container, queryText) {
    if (results.length === 0) {
        // กรณีไม่เจอ: แสดงข้อความแจ้งเตือนสวยๆ
        container.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-sm text-gray-400">ไม่พบผลลัพธ์สำหรับ "${queryText}"</p>
                <p class="text-xs text-gray-600 mt-1">ลองพิมพ์ชื่อภาษาอังกฤษ หรือคำสั้นๆ ดูครับ</p>
            </div>`;
    } else {
        // กรณีเจอ: วาดรายการอนิเมะ
        const listHtml = results.map(item => `
            <a href="pages/player.html?id=${item.id}" class="group flex items-start gap-3 p-3 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/50 transition-all cursor-pointer">
                <div class="relative flex-shrink-0">
                    <img src="${item.posterUrl || 'https://placehold.co/40x60'}" 
                         class="w-10 h-14 object-cover rounded shadow-md group-hover:scale-105 transition-transform duration-200"
                         loading="lazy">
                    ${item.rating ? `
                        <div class="absolute -bottom-1 -right-1 bg-gray-900/90 text-[8px] px-1 rounded text-yellow-500 border border-gray-700">
                            <i class="ri-star-fill"></i> ${parseFloat(item.rating).toFixed(1)}
                        </div>` : ''}
                </div>
                
                <div class="flex-1 min-w-0 flex flex-col justify-center h-14">
                    <h4 class="text-sm font-bold text-gray-200 truncate group-hover:text-green-400 transition-colors">
                        ${highlightMatch(item.title, queryText)}
                    </h4>
                    <div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>${item.releaseYear || 'TV'}</span>
                        <span class="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span class="truncate max-w-[150px] text-gray-400">${item.tags ? item.tags.split(' ').slice(0, 2).join(', ') : 'Anime'}</span>
                    </div>
                </div>
            </a>
        `).join('');

        // เพิ่มปุ่ม "ดูทั้งหมด" ด้านล่าง DropDown
        const viewAllHtml = `
            <a href="pages/grid.html?search=${encodeURIComponent(queryText)}" 
               class="block py-2.5 text-center text-xs font-bold text-green-400 bg-gray-800/80 hover:bg-gray-700 hover:text-green-300 transition-colors border-t border-gray-700/50 rounded-b-lg">
                ดูผลการค้นหาทั้งหมด (${results.length}+ รายการ) <i class="ri-arrow-right-s-line align-bottom"></i>
            </a>
        `;

        container.innerHTML = listHtml + viewAllHtml;
    }
    
    // แสดง DropDown
    container.classList.remove('hidden');
}

// 🔦 ฟังก์ชันไฮไลท์คำที่ตรงกับที่พิมพ์ (เช่น พิมพ์ "na" จะไฮไลท์ "Na"ruto)
function highlightMatch(text, query) {
    if (!query) return text;
    // สร้าง Regex แบบไม่สนตัวพิมพ์เล็กใหญ่ (gi)
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="text-green-400 font-extrabold">$1</span>');
}
