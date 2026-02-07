import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, 
    query, orderBy, limit, getDocs, serverTimestamp, 
    where, writeBatch, getCountFromServer, startAfter 
} from "firebase/firestore"; 

// ✅ แก้ไข Import ให้ถูกต้อง
import { db } from "../../js/config/db-config.js"; 
import { getCollectionRef, showToast, toggleLoading, showConfirmModal } from "./utils.js";
import { formatTimestamp, debounce } from "../../js/utils/tools.js";

// --- Global Variables for this Module ---
let currentEpisodesList = [];
let currentFilteredShowId = null;
let allShowOptions = []; 
let isSaving = false;

// Pagination Config
const EPISODES_PER_PAGE = 50;
let currentEpisodePage = 1;
let episodeCursors = [null];
let currentEpisodeSort = 'desc'; 

export function initEpisodeModule() {
    // 1. Inject Search Input UI
    injectEpisodeSearchUI();

    // 2. Event Listeners ปุ่มหลัก
    document.getElementById('btn-load-episodes')?.addEventListener('click', () => fetchEpisodes('reset'));
    document.getElementById('episode-form')?.addEventListener('submit', handleEpSubmit);
    document.getElementById('btn-submit-bulk')?.addEventListener('click', handleBulkSubmit);
    
    document.getElementById('next-page-ep')?.addEventListener('click', () => fetchEpisodes('next'));
    document.getElementById('prev-page-ep')?.addEventListener('click', () => fetchEpisodes('prev'));

    // 3. Sort Button Logic
    const btnSort = document.getElementById('btn-sort-episodes');
    if(btnSort) {
        btnSort.addEventListener('click', () => {
            currentEpisodeSort = currentEpisodeSort === 'desc' ? 'asc' : 'desc';
            const icon = btnSort.querySelector('i');
            if(currentEpisodeSort === 'asc') {
                icon.className = 'fas fa-sort-numeric-down text-emerald-400';
                btnSort.title = "เก่า -> ใหม่";
            } else {
                icon.className = 'fas fa-sort-numeric-up-alt';
                btnSort.title = "ใหม่ -> เก่า";
            }
            fetchEpisodes('reset');
        });
    }

    // 4. Init Dropdowns
    fetchShowsForDropdown();
    setupSearchableDropdowns();

    // 5. Listener สำหรับหน้า "เพิ่มตอนเดียว" (Auto Increment)
    document.getElementById('episode-show-select')?.addEventListener('change', (e) => {
        const showId = e.target.value;
        const form = document.getElementById('episode-form');
        if (!form.dataset.id && showId) {
            const showData = allShowOptions.find(s => s.id === showId);
            if (showData) {
                document.getElementById('episode-number').value = (showData.latestEpisodeNumber || 0) + 1;
            }
        }
    });

    // 6. Listener สำหรับหน้า "เพิ่มหลายตอน"
    document.getElementById('bulk-episode-show-select')?.addEventListener('change', (e) => {
        const showId = e.target.value;
        if (showId) {
            const showData = allShowOptions.find(s => s.id === showId);
            if (showData) {
                const nextEp = (showData.latestEpisodeNumber || 0) + 1;
                const bulkStartInput = document.getElementById('bulk-start-ep');
                if (bulkStartInput) bulkStartInput.value = nextEp;
            }
        }
    });
    
    window.openEpisodeModal = openEpisodeModal;
    window.openBulkEpisodeModal = openBulkEpisodeModal;
    window.deleteEpisode = deleteEpisode; 
}

function injectEpisodeSearchUI() {
    const sortBtn = document.getElementById('btn-sort-episodes');
    if (sortBtn && !document.getElementById('search-ep-number')) {
        const wrapper = document.createElement('div');
        wrapper.className = "relative";
        wrapper.innerHTML = `
            <input type="number" id="search-ep-number" placeholder="ค้นหาตอนที่..." 
                class="bg-gray-900 border border-gray-700 rounded-lg py-2.5 px-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-32"
            >
            <button id="btn-search-ep-number" class="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1.5">
                <i class="fas fa-search"></i>
            </button>
        `;
        sortBtn.parentNode.insertBefore(wrapper, sortBtn);
        
        const input = wrapper.querySelector('input');
        const btn = wrapper.querySelector('button');
        
        const doSearch = () => {
            const val = input.value.trim();
            if (val) fetchEpisodes('search_number', val);
            else fetchEpisodes('reset');
        };

        btn.addEventListener('click', doSearch);
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') doSearch();
            if (e.key === 'Backspace' && input.value === '') fetchEpisodes('reset');
        });
    }
}

function setupSearchableDropdowns() {
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
        input.type = "text";
        input.id = id;
        input.placeholder = "🔍 พิมพ์เพื่อค้นหาชื่อเรื่อง...";
        input.className = "block w-full bg-gray-800 border border-gray-600 rounded-lg text-xs py-1.5 px-3 text-gray-300 mb-1 focus:ring-1 focus:ring-indigo-500";
        
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(input);
        wrapper.appendChild(select); 

        input.addEventListener('input', debounce(async (e) => {
            const val = e.target.value.trim();
            if (val.length > 0) await fetchShowsForDropdown(val);
            else updateDropdownUI(allShowOptions); 
        }, 500));
    });
}

function resetSearchInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
        updateDropdownUI(allShowOptions); 
    }
}

async function fetchShowsForDropdown(searchTerm = '') {
    try {
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

        const snapshot = await getDocs(q);
        const options = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            title: doc.data().title,
            latestEpisodeNumber: doc.data().latestEpisodeNumber || 0 
        }));

        if (!searchTerm) allShowOptions = options; 
        updateDropdownUI(options);
    } catch (e) { console.warn("Dropdown Error:", e); }
}

function updateDropdownUI(options) {
    ['filter-episode-show', 'episode-show-select', 'bulk-episode-show-select'].forEach(id => {
        const select = document.getElementById(id);
        if(!select) return;
        const currentVal = select.value;
        
        let html = '<option value="">-- เลือกอนิเมะ --</option>';
        options.forEach(opt => {
            html += `<option value="${opt.id}">${opt.title}</option>`;
        });
        select.innerHTML = html;

        if(currentVal) {
             const inList = options.find(o => o.id === currentVal);
             if(!inList) {
                 const cached = allShowOptions.find(o => o.id === currentVal);
                 if(cached) {
                     const opt = document.createElement('option');
                     opt.value = cached.id;
                     opt.textContent = cached.title;
                     opt.selected = true;
                     select.appendChild(opt);
                 }
             }
             select.value = currentVal;
        }
    });
}

async function ensureShowOptionExists(showId, selectId) {
    if (!showId) return;
    const select = document.getElementById(selectId);
    if (!select) return;
    
    if (!select.querySelector(`option[value="${showId}"]`)) {
        try {
            const snap = await getDoc(doc(getCollectionRef("shows"), showId));
            if (snap.exists()) {
                const opt = document.createElement('option');
                opt.value = snap.id;
                opt.textContent = snap.data().title;
                select.appendChild(opt);
                select.value = showId;
                
                if(!allShowOptions.find(o => o.id === showId)) {
                    allShowOptions.push({ id: snap.id, title: snap.data().title, latestEpisodeNumber: snap.data().latestEpisodeNumber || 0 });
                }
            }
        } catch(e) { console.error(e); }
    } else {
        select.value = showId;
    }
}

async function recalculateLatestEpisode(showId) {
    if (!showId) return;
    try {
        const epRef = getCollectionRef("episodes");
        const q = query(epRef, where("showId", "==", showId), orderBy("number", "desc"), limit(1));
        const snapshot = await getDocs(q);
        
        let newLatest = 0;
        if (!snapshot.empty) {
            newLatest = snapshot.docs[0].data().number;
        }

        const qCount = query(epRef, where("showId", "==", showId));
        const epCountSnap = await getCountFromServer(qCount);
        
        await updateDoc(doc(getCollectionRef("shows"), showId), {
            latestEpisodeNumber: newLatest,
            episodeCount: epCountSnap.data().count,
            latestEpisodeUpdateAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
    } catch (e) {
        console.error("Recalculate Error:", e);
    }
}

async function checkDuplicateEpisode(showId, epNum, excludeId = null) {
    const q = query(
        getCollectionRef("episodes"), 
        where("showId", "==", showId), 
        where("number", "==", epNum)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;
    if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) return false;
    return true;
}

// --- CRUD Operations & Improved Fetching ---

async function fetchEpisodes(mode = 'reset', searchNumberVal = null) {
    const showSelect = document.getElementById('filter-episode-show');
    const showId = showSelect.value;
    
    if (!showId) { showToast('กรุณาเลือกอนิเมะก่อน', 'error'); return; }
    
    toggleLoading(true, "กำลังโหลดตอน...");
    
    if (currentFilteredShowId !== showId && mode !== 'reset') mode = 'reset';
    currentFilteredShowId = showId;

    const tbody = document.getElementById('episode-table-body');
    const btnNext = document.getElementById('next-page-ep');
    const btnPrev = document.getElementById('prev-page-ep');
    const pageInfo = document.getElementById('page-info-ep');
    const paginationDiv = document.getElementById('episode-pagination');
    
    const showName = showSelect.options[showSelect.selectedIndex]?.text || 'Unknown';
    document.getElementById('episodes-header-title').textContent = `จัดการตอน: ${showName}`;
    document.getElementById('btn-back-to-shows').classList.remove('hidden');

    try {
        const colRef = getCollectionRef("episodes");
        let q;

        // ** IMPROVED LOGIC: Search Specific Episode **
        if (mode === 'search_number' && searchNumberVal) {
            // ค้นหาเจาะจงตอน (ไม่ต้อง Paginate)
            q = query(colRef, 
                where("showId", "==", showId), 
                where("number", "==", parseFloat(searchNumberVal))
            );
            // ซ่อน Pagination ชั่วคราวเมื่อค้นหา
            if(paginationDiv) paginationDiv.classList.add('hidden');
        } 
        else {
            // โหลดแบบปกติ (Pagination)
            const baseQuery = query(colRef, where("showId", "==", showId), orderBy("number", currentEpisodeSort));
            
            if (mode === 'reset') {
                q = query(baseQuery, limit(EPISODES_PER_PAGE));
                currentEpisodePage = 1;
                episodeCursors = [null];
            } else if (mode === 'next') {
                const prevCursor = episodeCursors[currentEpisodePage];
                q = query(baseQuery, limit(EPISODES_PER_PAGE));
                if(prevCursor) q = query(baseQuery, startAfter(prevCursor), limit(EPISODES_PER_PAGE));
                currentEpisodePage++;
            } else if (mode === 'prev') {
                currentEpisodePage = Math.max(1, currentEpisodePage - 1);
                const cursor = episodeCursors[currentEpisodePage - 1];
                q = query(baseQuery, limit(EPISODES_PER_PAGE));
                if(cursor && currentEpisodePage > 1) q = query(baseQuery, startAfter(cursor), limit(EPISODES_PER_PAGE));
            }

            if(paginationDiv) paginationDiv.classList.remove('hidden');
        }

        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            let msg = 'ไม่พบข้อมูลตอน';
            if (mode === 'search_number') msg = `ไม่พบตอนที่ ${searchNumberVal}`;
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-500">${msg}</td></tr>`;
            currentEpisodesList = [];
            
            // ถ้าค้นหาไม่เจอ ให้ซ่อน Next
            if(btnNext) btnNext.disabled = true;
        } else {
            currentEpisodesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderEpisodeTable(currentEpisodesList);
            
            // Logic ปุ่ม Pagination (เฉพาะโหมดปกติ)
            if (mode !== 'search_number') {
                if (snapshot.docs.length === EPISODES_PER_PAGE) {
                     episodeCursors[currentEpisodePage] = snapshot.docs[snapshot.docs.length - 1];
                     if(btnNext) btnNext.disabled = false;
                } else {
                     if(btnNext) btnNext.disabled = true;
                }
                if(pageInfo) pageInfo.textContent = `หน้า ${currentEpisodePage}`;
                if(btnPrev) btnPrev.disabled = (currentEpisodePage === 1);
            }
        }

    } catch (error) {
        console.error(error);
        if (error.message.includes("index")) {
            const link = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-6">
                        <div class="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 inline-block max-w-2xl">
                            <div class="flex flex-col items-center gap-2">
                                <i class="fas fa-exclamation-triangle text-2xl text-yellow-500 mb-1"></i>
                                <span class="font-bold text-yellow-100">ระบบต้องการ Index เพิ่มเติม</span>
                                <span class="text-sm text-gray-400">เพื่อให้การเรียงลำดับทำงานได้ถูกต้อง</span>
                                ${link ? `<a href="${link[0]}" target="_blank" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded shadow-lg text-sm transition-all mt-2 flex items-center gap-2"><i class="fas fa-external-link-alt"></i> คลิกเพื่อสร้าง Index อัตโนมัติ</a>` : ''}
                            </div>
                        </div>
                    </td>
                </tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-400">Error: ${error.message}</td></tr>`;
        }
    } finally { toggleLoading(false); }
}

function renderEpisodeTable(data) {
    const tbody = document.getElementById('episode-table-body');
    tbody.innerHTML = '';
    data.forEach(ep => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-700/50 transition-colors border-b border-gray-700/50";
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-medium text-white">ตอนที่ ${ep.number}</td>
            <td class="px-6 py-4 text-sm text-gray-300">${ep.title || '-'}</td>
            <td class="px-6 py-4 text-sm text-gray-400">${formatTimestamp(ep.updatedAt)}</td>
            <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                <button class="text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 p-1.5 rounded-md transition-all" onclick="openEpisodeModal('${ep.id}')"><i class="fas fa-edit"></i></button>
                <button class="text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 p-1.5 rounded-md transition-all" onclick="deleteEpisode('${ep.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function openEpisodeModal(id = null) {
    const form = document.getElementById('episode-form');
    form.reset();
    form.dataset.id = id || '';
    
    resetSearchInput('search-ep-show');

    if (id) {
        const epData = currentEpisodesList.find(e => e.id === id);
        if (epData) {
            await ensureShowOptionExists(epData.showId, 'episode-show-select');
            document.getElementById('episode-show-select').value = epData.showId;
            document.getElementById('episode-number').value = epData.number;
            document.getElementById('episode-title').value = epData.title || '';
            document.getElementById('episode-url').value = epData.videoUrl || '';
        }
    } else {
        if (currentFilteredShowId) {
            await ensureShowOptionExists(currentFilteredShowId, 'episode-show-select');
            const select = document.getElementById('episode-show-select');
            select.value = currentFilteredShowId;
            select.dispatchEvent(new Event('change')); 
        }
    }
    
    document.getElementById('episode-modal').classList.remove('hidden');
    document.getElementById('episode-modal').classList.add('flex');
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
        const isDuplicate = await checkDuplicateEpisode(showId, epNum, id);
        if (isDuplicate) {
            throw new Error(`ตอนที่ ${epNum} มีอยู่ในระบบแล้ว!`);
        }

        const data = {
            showId, 
            number: epNum,
            title: document.getElementById('episode-title').value.trim(),
            videoUrl: document.getElementById('episode-url').value.trim(),
            updatedAt: serverTimestamp()
        };

        if (id) {
            await updateDoc(doc(getCollectionRef("episodes"), id), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef("episodes"), data);
        }

        await recalculateLatestEpisode(showId);

        showToast('บันทึกเรียบร้อย');
        document.getElementById('episode-modal').classList.add('hidden');
        document.getElementById('episode-modal').classList.remove('flex');
        
        if (currentFilteredShowId === showId) fetchEpisodes('current');
        
    } catch(e) { 
        showToast(e.message, 'error'); 
    } finally { 
        isSaving = false; toggleLoading(false); 
    }
}

async function openBulkEpisodeModal() {
    const showId = currentFilteredShowId;
    const form = document.getElementById('bulk-urls');
    form.value = '';
    
    resetSearchInput('search-bulk-show');

    if(showId) {
        await ensureShowOptionExists(showId, 'bulk-episode-show-select');
        const select = document.getElementById('bulk-episode-show-select');
        select.value = showId;
        
        const showData = allShowOptions.find(s => s.id === showId);
        if(showData) {
            document.getElementById('bulk-start-ep').value = (showData.latestEpisodeNumber || 0) + 1;
        }
    }
    
    document.getElementById('bulk-episode-modal').classList.remove('hidden');
    document.getElementById('bulk-episode-modal').classList.add('flex');
}

async function handleBulkSubmit() {
    if (isSaving) return;
    const showId = document.getElementById('bulk-episode-show-select').value;
    const rawUrls = document.getElementById('bulk-urls').value.trim().split('\n').filter(l => l.trim() !== '');
    let startEp = parseFloat(document.getElementById('bulk-start-ep').value);
    
    if (!showId) { showToast("กรุณาเลือกอนิเมะ", "error"); return; }
    if (rawUrls.length === 0) { showToast("กรุณาใส่ลิงก์วิดีโออย่างน้อย 1 รายการ", "error"); return; }

    showConfirmModal('ยืนยันเพิ่มหลายตอน', `จะเพิ่ม ${rawUrls.length} ตอน เริ่มที่ตอน ${startEp}?`, async () => {
        isSaving = true; toggleLoading(true, "กำลังตรวจสอบตอนซ้ำ..."); 
        
        try {
            const qCheck = query(
                getCollectionRef("episodes"),
                where("showId", "==", showId),
                where("number", ">=", startEp)
            );
            const existingSnaps = await getDocs(qCheck);
            const existingNumbers = new Set(existingSnaps.docs.map(d => d.data().number));
            
            let episodesToAdd = [];
            let duplicateCount = 0;
            let currentEp = startEp;

            rawUrls.forEach(url => {
                if (!existingNumbers.has(currentEp)) {
                    episodesToAdd.push({
                        showId,
                        number: currentEp,
                        title: `ตอนที่ ${currentEp}`,
                        videoUrl: url.trim(),
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                } else {
                    duplicateCount++;
                }
                currentEp++;
            });

            if (episodesToAdd.length === 0) {
                 showToast(`ทุกตอนในช่วงนี้มีอยู่แล้ว (${duplicateCount} ตอน)`, 'error');
                 toggleLoading(false); isSaving = false;
                 return;
            }

            if (duplicateCount > 0) {
                 const proceed = confirm(`⚠️ พบตอนซ้ำ ${duplicateCount} ตอน!\nระบบจะข้ามตอนที่ซ้ำไป และบันทึกเฉพาะ ${episodesToAdd.length} ตอนใหม่\n\nต้องการดำเนินการต่อหรือไม่?`);
                 if (!proceed) {
                     toggleLoading(false);
                     isSaving = false;
                     return;
                 }
            }
            
            toggleLoading(true, `กำลังบันทึก ${episodesToAdd.length} ตอนใหม่...`);

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

            await recalculateLatestEpisode(showId);
            
            showToast(`เพิ่มสำเร็จ ${episodesToAdd.length} ตอน (ข้าม ${duplicateCount} ตอนซ้ำ)`);
            document.getElementById('bulk-episode-modal').classList.add('hidden');
            document.getElementById('bulk-episode-modal').classList.remove('flex');
            
            if (currentFilteredShowId === showId) fetchEpisodes('current');

        } catch(e) { 
            console.error(e);
            showToast("เกิดข้อผิดพลาด: " + e.message, 'error'); 
        } finally {
            isSaving = false; toggleLoading(false);
        }
    });
}

async function deleteEpisode(id) {
    showConfirmModal('ลบตอน', 'ยืนยัน?', async () => {
        toggleLoading(true, "กำลังลบ...");
        try {
            const epRef = doc(getCollectionRef("episodes"), id);
            const epDoc = await getDoc(epRef);
            if(epDoc.exists()) {
                const { showId } = epDoc.data();
                await deleteDoc(epRef);
                await recalculateLatestEpisode(showId);
                showToast('ลบเรียบร้อย');
                fetchEpisodes('current');
            }
        } catch(e) { showToast(e.message, 'error'); }
        finally { toggleLoading(false); }
    });
}
