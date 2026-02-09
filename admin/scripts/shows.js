// admin/scripts/shows.js
import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, writeBatch,
    query, orderBy, limit, startAfter, getDocs, serverTimestamp, where 
} from "firebase/firestore";
import { db } from "../../js/config/db-config.js"; 
import { getCollectionRef, showToast, toggleLoading, showConfirmModal } from "./utils.js";
import { generateKeywords, formatTimestamp } from "../../js/utils/tools.js";

// --- 🧠 SERVICE LAYER (Business Logic) ---
const ShowService = {
    cursors: [null], // Pagination Cursors
    currentPage: 1,
    currentSort: { field: 'updatedAt', dir: 'desc' },
    
    resetPagination() {
        this.currentPage = 1;
        this.cursors = [null];
    },

    toggleSort(field) {
        if (this.currentSort.field === field) {
            this.currentSort.dir = this.currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.dir = 'desc';
        }
    },

    async fetchList(mode = 'reset', searchVal = '') {
        const SHOWS_PER_PAGE = 20;
        const colRef = getCollectionRef("shows");
        let q;

        // Base Query
        let baseQuery = query(colRef, orderBy(this.currentSort.field, this.currentSort.dir));

        // 1. Search Mode
        if (searchVal) {
            q = query(colRef, where("keywords", "array-contains", searchVal), limit(SHOWS_PER_PAGE));
            this.resetPagination();
        } 
        // 2. Pagination Mode
        else {
            if (mode === 'reset') {
                this.resetPagination();
                q = query(baseQuery, limit(SHOWS_PER_PAGE));
            } else if (mode === 'next') {
                const prevCursor = this.cursors[this.currentPage];
                q = prevCursor ? query(baseQuery, startAfter(prevCursor), limit(SHOWS_PER_PAGE)) : query(baseQuery, limit(SHOWS_PER_PAGE));
                if (prevCursor) this.currentPage++;
            } else if (mode === 'prev') {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    const cursor = this.cursors[this.currentPage - 1];
                    q = cursor ? query(baseQuery, startAfter(cursor), limit(SHOWS_PER_PAGE)) : query(baseQuery, limit(SHOWS_PER_PAGE));
                }
            } else if (mode === 'current') {
                const cursor = this.cursors[this.currentPage - 1];
                q = cursor ? query(baseQuery, startAfter(cursor), limit(SHOWS_PER_PAGE)) : query(baseQuery, limit(SHOWS_PER_PAGE));
            }
        }

        const snap = await getDocs(q);
        
        // Handle Empty Page
        if (snap.empty && mode !== 'reset' && this.currentPage > 1) {
            this.currentPage--; // Revert page
            return await this.fetchList('current'); // Retry
        }

        // Store Next Cursor
        if (snap.docs.length === SHOWS_PER_PAGE) {
            this.cursors[this.currentPage] = snap.docs[snap.docs.length - 1];
        }

        return {
            items: snap.docs.map(d => ({id: d.id, ...d.data()})),
            page: this.currentPage,
            hasNext: snap.docs.length === SHOWS_PER_PAGE,
            hasPrev: this.currentPage > 1
        };
    },

    async fetchById(id) {
        const docSnap = await getDoc(doc(getCollectionRef("shows"), id));
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async save(id, data) {
        data.updatedAt = serverTimestamp();
        data.keywords = generateKeywords(data.title);
        
        if (id) {
            await updateDoc(doc(getCollectionRef("shows"), id), data);
        } else {
            data.createdAt = serverTimestamp();
            data.latestEpisodeNumber = 0;
            data.episodeCount = 0;
            await addDoc(getCollectionRef("shows"), data);
        }
    },

    async deleteBatches(collectionName, fieldName, value) {
        const CHUNK_SIZE = 400;
        let hasMore = true;
        let totalDeleted = 0;

        while (hasMore) {
            const q = query(getCollectionRef(collectionName), where(fieldName, "==", value), limit(CHUNK_SIZE));
            const snapshot = await getDocs(q);
            if (snapshot.empty) { hasMore = false; break; }

            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            totalDeleted += snapshot.size;
            toggleLoading(true, `กำลังลบ ${collectionName}... (${totalDeleted})`);
        }
    },

    async deleteFull(id) {
        await this.deleteBatches("episodes", "showId", id);
        await this.deleteBatches("banners", "showId", id);
        await this.deleteBatches("reports", "showId", id);
        await this.deleteBatches("comments", "showId", id);
        await deleteDoc(doc(getCollectionRef("shows"), id));
    }
};

// --- 🎨 UI LAYER (View) ---
const ShowUI = {
    renderTable(data, onAction) {
        const tbody = document.getElementById('show-table-body');
        tbody.innerHTML = '';
        
        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-500">ไม่พบข้อมูล</td></tr>';
            return;
        }

        data.forEach(s => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-700 hover:bg-gray-800 transition-colors";
            tr.innerHTML = `
                <td class="px-6 py-4 flex items-center gap-3">
                    <img src="${s.thumbnailUrl}" class="w-10 h-10 object-cover rounded bg-gray-700" onerror="this.src='https://placehold.co/40x40?text=?'">
                    <div class="flex flex-col">
                        <span class="truncate max-w-xs text-white cursor-help" title="${s.title}">${s.title}</span>
                        <span class="text-xs text-gray-500">${(s.tags || []).slice(0,3).join(', ')}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-300 text-center font-medium">${s.latestEpisodeNumber || 0}</td>
                <td class="px-6 py-4 text-gray-300 text-center font-medium">${s.viewCount || 0}</td>
                <td class="px-6 py-4 text-gray-400 text-center text-sm font-mono">${formatTimestamp(s.updatedAt)}</td>
                <td class="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    <button class="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-xs btn-manage transition-colors" data-id="${s.id}"><i class="fas fa-list-ol"></i> ตอน</button>
                    <button class="bg-gray-700 hover:bg-gray-600 p-2 rounded text-gray-300 btn-edit transition-colors" data-id="${s.id}"><i class="fas fa-edit"></i></button>
                    <button class="bg-red-900/30 hover:bg-red-900/50 p-2 rounded text-red-400 btn-del transition-colors" data-id="${s.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Bind Events
        tbody.querySelectorAll('.btn-manage').forEach(b => b.onclick = () => onAction('manage', b.dataset.id));
        tbody.querySelectorAll('.btn-edit').forEach(b => b.onclick = () => onAction('edit', b.dataset.id));
        tbody.querySelectorAll('.btn-del').forEach(b => b.onclick = () => onAction('delete', b.dataset.id));
    },

    updatePagination(page, hasNext, hasPrev) {
        const pageInfo = document.getElementById('page-info-show');
        const btnNext = document.getElementById('next-page-show');
        const btnPrev = document.getElementById('prev-page-show');
        
        if(pageInfo) pageInfo.textContent = `หน้า ${page}`;
        if(btnNext) btnNext.disabled = !hasNext;
        if(btnPrev) btnPrev.disabled = !hasPrev;
    },

    openModal(show = null) {
        const modal = document.getElementById('show-modal');
        const form = document.getElementById('show-form');
        form.reset();
        form.dataset.id = show ? show.id : '';

        // Reset Tags
        document.querySelectorAll('.show-tag-option').forEach(cb => cb.checked = false);

        if (show) {
            document.getElementById('show-title').value = show.title;
            document.getElementById('show-desc').value = show.description || '';
            document.getElementById('show-thumbnail').value = show.thumbnailUrl;
            document.getElementById('show-view-count').value = show.viewCount || 0;
            document.getElementById('show-completed').checked = show.isCompleted || false;
            
            if (show.tags && Array.isArray(show.tags)) {
                show.tags.forEach(tagName => {
                    const cb = document.querySelector(`.show-tag-option[value="${tagName}"]`);
                    if(cb) cb.checked = true;
                });
            }
        }
        modal.classList.remove('hidden'); modal.classList.add('flex');
    },

    closeModal() {
        const modal = document.getElementById('show-modal');
        modal.classList.add('hidden'); modal.classList.remove('flex');
    }
};

// --- 🎮 CONTROLLER ---
export function initShowModule() {
    // Setup Listeners
    document.getElementById('btn-search-show')?.addEventListener('click', () => refreshShows(true));
    document.getElementById('btn-reset-show')?.addEventListener('click', () => {
        document.getElementById('search-show').value = '';
        refreshShows(false);
    });
    
    document.getElementById('show-form')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('next-page-show')?.addEventListener('click', () => loadShows('next'));
    document.getElementById('prev-page-show')?.addEventListener('click', () => loadShows('prev'));

    // Global Access
    window.openShowModal = (id) => handleOpenModal(id);
    window.sortShows = (field) => {
        ShowService.toggleSort(field);
        refreshShows(false);
    };

    // First Load
    refreshShows();
}

async function loadShows(mode = 'reset') {
    toggleLoading(true, "กำลังโหลด...");
    try {
        const searchVal = document.getElementById('search-show').value.trim().toLowerCase();
        const result = await ShowService.fetchList(mode, searchVal);
        
        ShowUI.renderTable(result.items, (action, id) => {
            if(action === 'manage') handleManage(id);
            if(action === 'edit') handleOpenModal(id);
            if(action === 'delete') handleDelete(id);
        });
        
        ShowUI.updatePagination(result.page, result.hasNext, result.hasPrev);
    } catch (e) {
        console.error(e);
        showToast("Error: " + e.message, 'error');
    } finally {
        toggleLoading(false);
    }
}

async function refreshShows(isSearch = false) {
    await loadShows(isSearch ? 'reset' : 'reset');
}

async function handleOpenModal(id = null) {
    if (id) {
        toggleLoading(true, "ดึงข้อมูล...");
        try {
            const show = await ShowService.fetchById(id);
            if(show) ShowUI.openModal(show);
            else showToast("ไม่พบข้อมูล", "error");
        } catch(e) { console.error(e); } 
        finally { toggleLoading(false); }
    } else {
        ShowUI.openModal();
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    toggleLoading(true, "กำลังบันทึก...");
    
    const id = e.target.dataset.id;
    const tags = Array.from(document.querySelectorAll('.show-tag-option:checked')).map(cb => cb.value);
    if(tags.length === 0) tags.push('อนิเมะ');

    const data = {
        title: document.getElementById('show-title').value.trim(),
        description: document.getElementById('show-desc').value,
        thumbnailUrl: document.getElementById('show-thumbnail').value,
        viewCount: parseInt(document.getElementById('show-view-count').value) || 0,
        isCompleted: document.getElementById('show-completed').checked,
        tags: tags
    };

    try {
        await ShowService.save(id, data);
        showToast('บันทึกสำเร็จ');
        ShowUI.closeModal();
        refreshShows(); // Reload List
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        toggleLoading(false);
    }
}

async function handleDelete(id) {
    showConfirmModal('ลบอนิเมะ', 'ยืนยันการลบ? ข้อมูลทั้งหมดที่เกี่ยวข้องจะหายไปถาวร', async () => {
        toggleLoading(true, "กำลังลบ...");
        try {
            await ShowService.deleteFull(id);
            showToast('ลบข้อมูลสำเร็จ');
            refreshShows();
            if(window.fetchDashboardStats) window.fetchDashboardStats();
        } catch(e) {
            console.error(e);
            showToast("ลบไม่สำเร็จ: " + e.message, 'error');
        } finally {
            toggleLoading(false);
        }
    });
}

function handleManage(id) {
    window.switchTab('episodes'); 
    const select = document.getElementById('filter-episode-show');
    if(select) {
        select.value = id;
        const loadBtn = document.getElementById('btn-load-episodes');
        if(loadBtn) loadBtn.click();
    }
}
