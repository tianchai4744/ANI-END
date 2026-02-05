import { collection, query, where, getDocs, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ✅ แก้ไขตรงนี้ 1: ถอยหลัง (..) ไปหา config
import { db, appId } from "../config/firebase.js"; 

// ✅ แก้ไขตรงนี้ 2: ถอยหลัง (..) ไปหา utils และเปลี่ยนชื่อไฟล์เป็น common.js ให้ถูก
import { generateSearchTerms, debounce } from "../utils/common.js"; 

// เพิ่มพารามิเตอร์ limitCount (Default = 5)
export function setupSearchSystem(historyItems = [], limitCount = 5) {
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileSearchDropdown = document.getElementById('mobile-search-dropdown');

    // ฟังก์ชันค้นหาหลัก
    const performSearch = async (term, dropdownElement) => {
        if (!term || term.length < 2) {
            dropdownElement.classList.add('hidden');
            dropdownElement.innerHTML = '';
            return;
        }

        dropdownElement.innerHTML = `<div class="p-4 text-center text-gray-400"><i class="ri-loader-4-line animate-spin"></i> กำลังค้นหา...</div>`;
        dropdownElement.classList.remove('hidden');

        try {
            // ใช้ Logic กลางจาก utils.js
            const searchTerms = generateSearchTerms(term);
            const showsRef = collection(db, `artifacts/${appId}/public/data/shows`);
            
            // ใช้ limitCount แทนการ Hardcode
            const promises = searchTerms.map(t => 
                getDocs(query(showsRef, where("keywords", "array-contains", t), limit(limitCount)))
            );

            const snapshots = await Promise.all(promises);
            
            const results = new Map();
            snapshots.forEach(snap => {
                snap.forEach(doc => {
                    if (!results.has(doc.id)) {
                        results.set(doc.id, { id: doc.id, ...doc.data() });
                    }
                });
            });

            // ตัดผลลัพธ์ตามจำนวน limitCount
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

        let html = '';
        results.forEach(show => {
            const historyItem = history.find(h => h.showId === show.id);
            const link = historyItem && historyItem.lastWatchedEpisodeId 
                ? `player.html?id=${show.id}&ep_id=${historyItem.lastWatchedEpisodeId}` 
                : `player.html?id=${show.id}`;
            
            // แก้ไข path ของ player.html ให้เป็น Absolute Path เพื่อความชัวร์ (ใช้ pathPrefix จาก context ถ้าทำได้ แต่นี่ hardcode ไปก่อน)
            // เพื่อความปลอดภัย ผมจะใส่ ../pages/ หรือ pages/ หรือ /pages/ ขึ้นอยู่กับว่า search นี้เรียกจากไหน
            // แต่เพื่อให้ง่ายที่สุด ให้ใช้ลิงก์แบบนี้ครับ (เพราะเดี๋ยว navbar.js จะแก้ลิงก์ให้เอง หรือ browser จะ relative ให้เอง)
            
            // *หมายเหตุ: ถ้าหน้า search นี้ถูกเรียกจาก index.html ลิงก์ player.html จะต้องเป็น pages/player.html
            // แต่ถ้าเรียกจาก pages/grid.html ลิงก์จะเป็น player.html เฉยๆ
            // เพื่อแก้ปัญหานี้ เราจะใช้ Absolute Path ในโค้ด JS ไปเลยครับ
            
            const realLink = `/ANI-END/pages/${link}`; // ⚠️ (วิธีแก้ปัญหาลิงก์ GitHub Pages)
            // หรือถ้าจะให้ยืดหยุ่นกว่านี้ ให้ใช้โค้ดเดิมแล้วปล่อยให้ Browser จัดการ ถ้าไฟล์ HTML เรียกถูกที่

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
            <a href="grid.html?search=${encodeURIComponent(searchTerm)}" class="block p-3 text-center text-sm text-green-400 hover:text-green-300 bg-gray-800 hover:bg-gray-700 font-medium transition-colors">
                ดูผลการค้นหาทั้งหมด (${results.length}+)
            </a>
        `;

        dropdown.innerHTML = html;
        
        // --- ส่วนเสริม: แก้ไขลิงก์ใน Dropdown ให้ถูกต้องตามหน้าปัจจุบัน ---
        // (เพราะ search.js ถูกใช้ทั้งหน้าแรกและหน้าย่อย ลิงก์อาจจะเพี้ยนได้)
        const currentPath = window.location.pathname;
        const isInPages = currentPath.includes('/pages/');
        const prefix = isInPages ? '' : 'pages/'; // ถ้าอยู่หน้าแรกต้องเติม pages/ ถ้าอยู่หน้าย่อยไม่ต้อง
        
        dropdown.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('/')) {
                a.setAttribute('href', prefix + href);
            }
        });
    };

    const onSearch = debounce((e, dropdown) => performSearch(e.target.value, dropdown), 400);

    // Desktop Listeners
    if (searchInput && searchDropdown) {
        searchInput.addEventListener('input', (e) => onSearch(e, searchDropdown));
        searchInput.addEventListener('focus', (e) => { if(e.target.value) searchDropdown.classList.remove('hidden'); });
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                // แก้ redirect path
                const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
                window.location.href = `${prefix}grid.html?search=${encodeURIComponent(e.target.value.trim())}`;
            }
        });
    }

    // Mobile Listeners
    if (mobileSearchInput && mobileSearchDropdown) {
        mobileSearchInput.addEventListener('input', (e) => onSearch(e, mobileSearchDropdown));
        mobileSearchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                // แก้ redirect path
                const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
                window.location.href = `${prefix}grid.html?search=${encodeURIComponent(e.target.value.trim())}`;
            }
        });
    }

    // ปิด Dropdown เมื่อคลิกข้างนอก
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
