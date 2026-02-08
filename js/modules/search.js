import { debounce } from "../utils/tools.js";

// เก็บข้อมูลเพื่อค้นหาแบบ Client-side (เร็วมากๆ)
let searchIndex = [];

export function setupSearchSystem(initialData = []) {
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    
    // ถ้าไม่มีข้อมูล ให้ใช้ข้อมูลเริ่มต้น (เช่น ประวัติการดู หรือ Top 10)
    searchIndex = initialData;

    if (!searchInput || !searchDropdown) return;

    // ✅ ใช้ Debounce: รอให้หยุดพิมพ์ 300ms ค่อยค้นหา (ประหยัดแรงเครื่อง)
    const performSearch = debounce((query) => {
        if (!query) {
            searchDropdown.classList.add('hidden');
            return;
        }

        // Logic การค้นหา (ตัวอย่างเบื้องต้น)
        // ถ้าโปรเจกต์ใหญ่ขึ้น แนะนำให้ยิงไปหา Firestore หรือใช้ Algolia
        const results = searchIndex.filter(item => 
            item.title && item.title.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5); // เอาแค่ 5 อันดับแรก

        renderSearchResults(results, searchDropdown);
    }, 300);

    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value.trim());
    });

    // ปิด Dropdown เมื่อคลิกข้างนอก
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });
}

function renderSearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = `<div class="p-4 text-sm text-gray-400 text-center">ไม่พบข้อมูล</div>`;
    } else {
        container.innerHTML = results.map(item => `
            <a href="/pages/player.html?id=${item.id}" class="search-dropdown-item block px-4 py-2 border-b border-gray-700 last:border-0">
                <div class="font-bold text-white text-sm">${item.title}</div>
                <div class="text-xs text-gray-400 truncate">${item.description || ''}</div>
            </a>
        `).join('');
    }
    container.classList.remove('hidden');
}
