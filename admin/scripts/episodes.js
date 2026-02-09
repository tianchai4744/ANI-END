// admin/scripts/episodes.js
import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, 
    query, orderBy, limit, getDocs, serverTimestamp, 
    where, writeBatch, getCountFromServer, startAfter 
} from "firebase/firestore"; 

import { db } from "../../js/config/db-config.js"; 
import { getCollectionRef, showToast, toggleLoading, showConfirmModal } from "./utils.js";
import { formatTimestamp, debounce } from "../../js/utils/tools.js";

// --- 🧠 SERVICE LAYER (Business Logic) ---
const EpisodeService = {
    cursors: [null],
    currentPage: 1,
    currentSort: 'desc',
    
    // Reset State
    resetPagination() {
        this.currentPage = 1;
        this.cursors = [null];
    },

    toggleSort() {
        this.currentSort = this.currentSort === 'desc' ? 'asc' : 'desc';
        return this.currentSort;
    },

    // 1. Fetch Episodes (List / Search)
    async fetchList(showId, mode = 'reset', searchNumberVal = null) {
        const PER_PAGE = 50;
        const colRef = getCollectionRef("episodes");
        let q;

        // Mode: Search Specific Number
        if (mode === 'search_number' && searchNumberVal) {
            q = query(colRef, 
                where("showId", "==", showId), 
                where("number", "==", parseFloat(searchNumberVal))
            );
            const snapshot = await getDocs(q);
            return { 
                items: snapshot.docs.map(d => ({id: d.id, ...d.data()})), 
                isSearch: true 
            };
        }

        // Mode: Pagination
        const baseQuery = query(colRef, where("showId", "==", showId), orderBy("number", this.currentSort));

        if (mode === 'reset') {
            this.resetPagination();
            q = query(baseQuery, limit(PER_PAGE));
        } else if (mode === 'next') {
            const prevCursor = this.cursors[this.currentPage];
            q = prevCursor ? query(baseQuery, startAfter(prevCursor), limit(PER_PAGE)) : query(baseQuery, limit(PER_PAGE));
            if (prevCursor) this.currentPage++;
        } else if (mode === 'prev') {
            if (this.currentPage > 1) {
                this.currentPage--;
                const cursor = this.cursors[this.currentPage - 1];
                q = cursor ? query(baseQuery, startAfter(cursor), limit(PER_PAGE)) : query(baseQuery, limit(PER_PAGE));
            }
        } else if (mode === 'current') {
            // Reload current page
            const cursor = this.cursors[this.currentPage - 1];
            q = cursor ? query(baseQuery, startAfter(cursor), limit(PER_PAGE)) : query(baseQuery, limit(PER_PAGE));
        }

        const snapshot = await getDocs(q);
        
        // Save cursor for next page
        if (snapshot.docs.length === PER_PAGE) {
            this.cursors[this.currentPage] = snapshot.docs[snapshot.docs.length - 1];
        }

        return {
            items: snapshot.docs.map(d => ({ id: d.id, ...d.data() })),
            page: this.currentPage,
            hasNext: snapshot.docs.length === PER_PAGE,
            hasPrev: this.currentPage > 1,
            isSearch: false
        };
    },

    // 2. Fetch Shows for Dropdown
    async fetchShows(searchTerm = '') {
        let q;
        if (searchTerm) {
            q = query(getCollectionRef("shows"), 
                where("title", ">=", searchTerm), 
                where("title", "<=", searchTerm + '\uf8ff'),
                limit(20)
            );
        } else {
            q = query(getCollectionRef("shows"), orderBy("updatedAt", "desc"), limit(50));
        }
        return (await getDocs(q)).docs.map(doc => ({ 
            id: doc.id, 
            title: doc.data().title,
            latestEpisodeNumber: doc.data().latestEpisodeNumber || 0 
        }));
    },

    // ✅ เพิ่มฟังก์ชัน: ดึงชื่อเรื่องจาก ID (กรณีหาใน Dropdown ไม่เจอ)
    async getShowTitle(id) {
        if (!id) return "Unknown";
        try {
            const snap = await getDoc(doc(getCollectionRef("shows"), id));
            return snap.exists() ? snap.data().title : "Unknown Show";
        } catch (e) { return "Error Loading Title"; }
    },

    // 3. Helper: Check Duplicate
    async checkDuplicate(showId, epNum, excludeId = null) {
        const q = query(getCollectionRef("episodes"), where("showId", "==", showId), where("number", "==", epNum));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return false;
        if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) return false;
        return true;
    },

    // 4. Save Single Episode
    async save(id, data) {
        if (await this.checkDuplicate(data.showId, data.number, id)) {
            throw new Error(`ตอนที่ ${data.number} มีอยู่ในระบบแล้ว!`);
        }

        data.updatedAt = serverTimestamp();
        if (id) {
            await updateDoc(doc(getCollectionRef("episodes"), id), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef("episodes"), data);
        }
        await this.recalculateStats(data.showId);
    },

    // 5. Save Bulk Episodes
    async saveBulk(episodesToAdd, showId) {
        const CHUNK_SIZE = 400;
        for (let i = 0; i < episodesToAdd.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = episodesToAdd.slice(i, i + CHUNK_SIZE);
            chunk.forEach(epData => {
                const ref = doc(getCollectionRef("episodes"));
                batch.set(ref, epData);
            });
            await batch.commit();
        }
        await this.recalculateStats(showId);
    },

    // 6. Delete Episode
    async delete(id) {
        const epRef = doc(getCollectionRef("episodes"), id);
        const epDoc = await getDoc(epRef);
        if(epDoc.exists()) {
            const { showId } = epDoc.data();
            await deleteDoc(epRef);
            await this.recalculateStats(showId);
            return showId;
        }
        return null;
    },

    // 7. Recalculate Show Stats
    async recalculateStats(showId) {
        if (!showId) return;
        try {
            const epRef = getCollectionRef("episodes");
            // Find Latest
            const q = query(epRef, where("showId", "==", showId), orderBy("number", "desc"), limit(1));
            const snapshot = await getDocs(q);
            const newLatest = !snapshot.empty ? snapshot.docs[0].data().number : 0;

            // Count Total
            const qCount = query(epRef, where("showId", "==", showId));
            const epCountSnap = await getCountFromServer(qCount);
            
            await updateDoc(doc(getCollectionRef("shows"), showId), {
                latestEpisodeNumber: newLatest,
                episodeCount: epCountSnap.data().count,
                latestEpisodeUpdateAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (e) { console.error("Recalculate Error:", e); }
    }
};

// --- 🎨 UI LAYER (View) ---
const EpisodeUI = {
    allShowOptions: [],

    injectSearch(onSearch) {
        const sortBtn = document.getElementById('btn-sort-episodes');
        if (sortBtn && !document.getElementById('search-ep-number')) {
            const wrapper = document.createElement('div');
            wrapper.className = "relative";
            wrapper.innerHTML = `
                <input type="number" id="search-ep-number" placeholder="ค้นหาตอนที่..." 
                    class="bg-gray-900 border border-gray-700 rounded-lg py-2.5 px-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-32">
                <button id="btn-search-ep-number" class="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1.5"><i class="fas fa-search"></i></button>
            `;
            sortBtn.parentNode.insertBefore(wrapper, sortBtn);
            
            const input = wrapper.querySelector('input');
            const btn = wrapper.querySelector('button');
            const doSearch = () => onSearch(input.value.trim());

            btn.addEventListener('click', doSearch);
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') doSearch();
                if (e.key === 'Backspace' && input.value === '') onSearch('');
            });
        }
    },

    setupDropdowns(onSearchShow) {
        const targets = [
            { select: document.getElementById('episode-show-select'), id: 'search-ep-show' }, 
            { select: document.getElementById('filter-episode-show'), id: 'search-filter-show' },
            { select: document.getElementById('bulk-episode-show-select'), id: 'search-bulk-show' }
        ];

        targets.forEach(({ select, id }) => {
            if (!select || select.parentNode.querySelector('input')) return;
            const wrapper = document.createElement('div');
            wrapper.className = "space-y-1 mb-2 searchable-wrapper";
            const input = document.createElement('input');
            input.type = "text"; input.id = id;
            input.placeholder = "🔍 พิมพ์เพื่อค้นหาชื่อเรื่อง...";
            input.className = "block w-full bg-gray-800 border border-gray-600 rounded-lg text-xs py-1.5 px-3 text-gray-300 mb-1 focus:ring-1 focus:ring-indigo-500";
            
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(input);
            wrapper.appendChild(select); 

            input.addEventListener('input', debounce((e) => onSearchShow(e.target.value.trim()), 500));
        });
    },

    updateDropdowns(options, searchTerm = '') {
        if (!searchTerm) this.allShowOptions = options; 
        
        ['filter-episode-show', 'episode-show-select', 'bulk-episode-show-select'].forEach(id => {
            const select = document.getElementById(id);
            if(!select) return;
            const currentVal = select.value;
            
            let html = '<option value="">-- เลือกอนิเมะ --</option>';
            options.forEach(opt => html += `<option value="${opt.id}">${opt.title}</option>`);
            select.innerHTML = html;

            // Preserve selected value even if not in current search list
            if(currentVal) {
                 const inList = options.find(o => o.id === currentVal);
                 if(!inList) {
                     const cached = this.allShowOptions.find(o => o.id === currentVal);
                     if(cached) {
                         this.addOption(id, cached.id, cached.title, true);
                     }
                 }
                 select.value = currentVal;
            }
        });
    },

    // ✅ เพิ่มฟังก์ชันช่วย: เติม Option เข้า Dropdown
    addOption(selectId, value, text, isSelected = false) {
        const select = document.getElementById(selectId);
        if (!select) return;
        if (!select.querySelector(`option[value="${value}"]`)) {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = text;
            if (isSelected) opt.selected = true;
            select.appendChild(opt);
        }
    },

    renderTable(data, onEdit, onDelete) {
        const tbody = document.getElementById('episode-table-body');
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-500">ไม่พบข้อมูลตอน</td></tr>`;
            return;
        }

        data.forEach(ep => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-700/50 transition-colors border-b border-gray-700/50";
            tr.innerHTML = `
                <td class="px-6 py-4 text-sm font-medium text-white">ตอนที่ ${ep.number}</td>
                <td class="px-6 py-4 text-sm text-gray-300">${ep.title || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-400">${formatTimestamp(ep.updatedAt)}</td>
                <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                    <button class="btn-edit text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 p-1.5 rounded-md transition-all" data-id="${ep.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-del text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 p-1.5 rounded-md transition-all" data-id="${ep.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-edit').forEach(b => b.onclick = () => onEdit(b.dataset.id));
        tbody.querySelectorAll('.btn-del').forEach(b => b.onclick = () => onDelete(b.dataset.id));
    },

    renderPagination(page, hasNext, hasPrev, isSearchMode) {
        const btnNext = document.getElementById('next-page-ep');
        const btnPrev = document.getElementById('prev-page-ep');
        const pageInfo = document.getElementById('page-info-ep');
        const paginationDiv = document.getElementById('episode-pagination');

        if (isSearchMode) {
            if(paginationDiv) paginationDiv.classList.add('hidden');
        } else {
            if(paginationDiv) paginationDiv.classList.remove('hidden');
            if(pageInfo) pageInfo.textContent = `หน้า ${page}`;
            if(btnNext) btnNext.disabled = !hasNext;
            if(btnPrev) btnPrev.disabled = !hasPrev;
        }
    },

    renderError(error) {
        const tbody = document.getElementById('episode-table-body');
        if (error.message.includes("index")) {
            const link = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6"><div class="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 inline-block max-w-2xl"><i class="fas fa-exclamation-triangle text-2xl text-yellow-500 mb-1"></i><br><span class="font-bold text-yellow-100">ระบบต้องการ Index เพิ่มเติม</span><br>${link ? `<a href="${link[0]}" target="_blank" class="text-yellow-400 underline">คลิกสร้าง Index</a>` : ''}</div></td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-400">Error: ${error.message}</td></tr>`;
        }
    },

    openModal(id, currentEpisodes, currentShowId) {
        const form = document.getElementById('episode-form');
        form.reset();
        form.dataset.id = id || '';
        const searchInput = document.getElementById('search-ep-show');
        if(searchInput) searchInput.value = '';

        document.getElementById('episode-modal').classList.remove('hidden');
        document.getElementById('episode-modal').classList.add('flex');
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// --- 🎮 CONTROLLER ---
let currentFilteredShowId = null;
let currentEpisodesList = [];
let isSaving = false;

export function initEpisodeModule() {
    EpisodeUI.injectSearch((val) => fetchEpisodes('search_number', val));
    
    // Bind Buttons
    document.getElementById('btn-load-episodes')?.addEventListener('click', () => fetchEpisodes('reset'));
    document.getElementById('episode-form')?.addEventListener('submit', handleEpSubmit);
    document.getElementById('btn-submit-bulk')?.addEventListener('click', handleBulkSubmit);
    document.getElementById('next-page-ep')?.addEventListener('click', () => fetchEpisodes('next'));
    document.getElementById('prev-page-ep')?.addEventListener('click', () => fetchEpisodes('prev'));

    // Sort Button
    const btnSort = document.getElementById('btn-sort-episodes');
    if(btnSort) {
        btnSort.addEventListener('click', () => {
            const dir = EpisodeService.toggleSort();
            const icon = btnSort.querySelector('i');
            icon.className = dir === 'asc' ? 'fas fa-sort-numeric-down text-emerald-400' : 'fas fa-sort-numeric-up-alt';
            fetchEpisodes('reset');
        });
    }

    // Dropdowns
    EpisodeUI.setupDropdowns((term) => loadShowDropdowns(term));
    loadShowDropdowns(); 

    // Auto Increment Logic
    const handleShowSelectChange = (e, targetInputId) => {
        const showId = e.target.value;
        const showData = EpisodeUI.allShowOptions.find(s => s.id === showId);
        if (showData) {
            document.getElementById(targetInputId).value = (showData.latestEpisodeNumber || 0) + 1;
        }
    };

    document.getElementById('episode-show-select')?.addEventListener('change', (e) => {
        if (!document.getElementById('episode-form').dataset.id) handleShowSelectChange(e, 'episode-number');
    });
    document.getElementById('bulk-episode-show-select')?.addEventListener('change', (e) => handleShowSelectChange(e, 'bulk-start-ep'));

    // Global Access (เชื่อมต่อ UI และ Service อย่างสมบูรณ์)
    window.openEpisodeModal = async (id) => {
        EpisodeUI.openModal(id, currentEpisodesList, currentFilteredShowId);
        
        if (id) {
            const epData = currentEpisodesList.find(e => e.id === id);
            if (epData) {
                // ✅ แก้ไข: ถ้าหา Option ไม่เจอ ให้ดึงชื่อจาก DB มาแสดง
                const select = document.getElementById('episode-show-select');
                if (!select.querySelector(`option[value="${epData.showId}"]`)) {
                    const title = await EpisodeService.getShowTitle(epData.showId);
                    EpisodeUI.addOption('episode-show-select', epData.showId, title);
                }
                select.value = epData.showId;
                document.getElementById('episode-number').value = epData.number;
                document.getElementById('episode-title').value = epData.title || '';
                document.getElementById('episode-url').value = epData.videoUrl || '';
            }
        } else if (currentFilteredShowId) {
            const select = document.getElementById('episode-show-select');
            select.value = currentFilteredShowId;
            select.dispatchEvent(new Event('change'));
        }
    };

    window.openBulkEpisodeModal = () => {
        const showData = EpisodeUI.allShowOptions.find(s => s.id === currentFilteredShowId);
        EpisodeUI.openModal('bulk-episode-modal'); // Re-use simpler open logic if possible or separate
        // Explicit logic for bulk modal to keep it clean
        const form = document.getElementById('bulk-urls');
        form.value = '';
        document.getElementById('search-bulk-show').value = '';
        
        if(currentFilteredShowId) {
            const select = document.getElementById('bulk-episode-show-select');
            select.value = currentFilteredShowId;
            if(showData) document.getElementById('bulk-start-ep').value = (showData.latestEpisodeNumber || 0) + 1;
        }
        document.getElementById('bulk-episode-modal').classList.remove('hidden');
        document.getElementById('bulk-episode-modal').classList.add('flex');
    };
    
    window.deleteEpisode = handleDelete;
}

async function loadShowDropdowns(term = '') {
    const options = await EpisodeService.fetchShows(term);
    EpisodeUI.updateDropdowns(options, term);
}

async function fetchEpisodes(mode = 'reset', searchVal = null) {
    const showId = document.getElementById('filter-episode-show').value;
    if (!showId) { showToast('กรุณาเลือกอนิเมะก่อน', 'error'); return; }

    toggleLoading(true, "กำลังโหลดตอน...");
    if (currentFilteredShowId !== showId && mode !== 'reset') mode = 'reset';
    currentFilteredShowId = showId;

    // Update Header
    const showSelect = document.getElementById('filter-episode-show');
    const showName = showSelect.options[showSelect.selectedIndex]?.text || 'Unknown';
    document.getElementById('episodes-header-title').textContent = `จัดการตอน: ${showName}`;
    document.getElementById('btn-back-to-shows').classList.remove('hidden');

    try {
        const result = await EpisodeService.fetchList(showId, mode, searchVal);
        currentEpisodesList = result.items;
        EpisodeUI.renderTable(result.items, (id) => window.openEpisodeModal(id), (id) => window.deleteEpisode(id));
        EpisodeUI.renderPagination(result.page, result.hasNext, result.hasPrev, result.isSearch);
    } catch (e) {
        console.error(e);
        EpisodeUI.renderError(e);
    } finally { toggleLoading(false); }
}

async function handleEpSubmit(e) {
    e.preventDefault();
    if(isSaving) return;
    
    const id = e.target.dataset.id;
    const showId = document.getElementById('episode-show-select').value;
    const epNum = parseFloat(document.getElementById('episode-number').value);
    
    if(!showId) { showToast('กรุณาเลือกอนิเมะ', 'error'); return; }

    isSaving = true; toggleLoading(true);

    try {
        const data = {
            showId, number: epNum,
            title: document.getElementById('episode-title').value.trim(),
            videoUrl: document.getElementById('episode-url').value.trim()
        };
        await EpisodeService.save(id, data);
        showToast('บันทึกเรียบร้อย');
        EpisodeUI.closeModal('episode-modal');
        if (currentFilteredShowId === showId) fetchEpisodes('current');
    } catch(e) { showToast(e.message, 'error'); } 
    finally { isSaving = false; toggleLoading(false); }
}

async function handleBulkSubmit() {
    if (isSaving) return;
    const showId = document.getElementById('bulk-episode-show-select').value;
    const rawUrls = document.getElementById('bulk-urls').value.trim().split('\n').filter(l => l.trim() !== '');
    let startEp = parseFloat(document.getElementById('bulk-start-ep').value);
    
    if (!showId || rawUrls.length === 0) { showToast("ข้อมูลไม่ครบถ้วน", "error"); return; }

    showConfirmModal('ยืนยันเพิ่มหลายตอน', `จะเพิ่ม ${rawUrls.length} ตอน เริ่มที่ตอน ${startEp}?`, async () => {
        isSaving = true; toggleLoading(true, "ตรวจสอบ...");
        try {
            const colRef = getCollectionRef("episodes");
            const qCheck = query(colRef, where("showId", "==", showId), where("number", ">=", startEp));
            const existingSnaps = await getDocs(qCheck);
            const existingNumbers = new Set(existingSnaps.docs.map(d => d.data().number));
            
            let episodesToAdd = [];
            let currentEp = startEp;
            let duplicates = 0;

            rawUrls.forEach(url => {
                if (!existingNumbers.has(currentEp)) {
                    episodesToAdd.push({
                        showId, number: currentEp,
                        title: `ตอนที่ ${currentEp}`, videoUrl: url.trim(),
                        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
                    });
                } else duplicates++;
                currentEp++;
            });

            if (episodesToAdd.length === 0) {
                 showToast(`ทุกตอนมีอยู่แล้ว (${duplicates} ตอน)`, 'error');
                 return;
            }

            if (duplicates > 0 && !confirm(`⚠️ พบตอนซ้ำ ${duplicates} ตอน! จะข้ามไป บันทึกเฉพาะ ${episodesToAdd.length} ตอนใหม่?`)) return;

            toggleLoading(true, `กำลังบันทึก ${episodesToAdd.length} ตอน...`);
            await EpisodeService.saveBulk(episodesToAdd, showId);
            
            showToast(`เพิ่มสำเร็จ ${episodesToAdd.length} ตอน`);
            EpisodeUI.closeModal('bulk-episode-modal');
            if (currentFilteredShowId === showId) fetchEpisodes('current');

        } catch(e) { showToast(e.message, 'error'); } 
        finally { isSaving = false; toggleLoading(false); }
    });
}

async function handleDelete(id) {
    showConfirmModal('ลบตอน', 'ยืนยัน?', async () => {
        toggleLoading(true, "กำลังลบ...");
        try {
            const showId = await EpisodeService.delete(id);
            showToast('ลบเรียบร้อย');
            if(showId === currentFilteredShowId) fetchEpisodes('current');
        } catch(e) { showToast(e.message, 'error'); }
        finally { toggleLoading(false); }
    });
}
