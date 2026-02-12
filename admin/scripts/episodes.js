// admin/scripts/episodes.js
import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, writeBatch,
    query, orderBy, limit, startAfter, getDocs, serverTimestamp, where 
} from "firebase/firestore";
import { db } from "../../js/config/db-config.js"; 
import { getCollectionRef, showToast, toggleLoading, showConfirmModal } from "./utils.js";
import { formatTimestamp } from "../../js/utils/tools.js";

const EpisodeService = {
    cursors: [null], 
    currentPage: 1,
    currentShowId: null,

    resetPagination() {
        this.currentPage = 1;
        this.cursors = [null];
    },

    async fetchList(showId, mode = 'reset') {
        if (!showId) return { items: [], page: 1, hasNext: false, hasPrev: false };
        this.currentShowId = showId;

        const PER_PAGE = 20;
        const colRef = getCollectionRef("episodes");
        const baseQuery = query(colRef, where("showId", "==", showId), orderBy("number", "desc"));
        let q;

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
        }

        const snap = await getDocs(q);
        
        if (snap.empty && mode !== 'reset' && this.currentPage > 1) {
            this.currentPage--;
            return await this.fetchList(showId, 'current');
        }

        if (snap.docs.length === PER_PAGE) {
            this.cursors[this.currentPage] = snap.docs[snap.docs.length - 1];
        }

        return {
            items: snap.docs.map(d => ({id: d.id, ...d.data()})),
            page: this.currentPage,
            hasNext: snap.docs.length === PER_PAGE,
            hasPrev: this.currentPage > 1
        };
    },

    async save(id, data) {
        data.updatedAt = serverTimestamp();
        
        // Update Stats in Show
        const showRef = doc(getCollectionRef("shows"), data.showId);
        
        if (id) {
            await updateDoc(doc(getCollectionRef("episodes"), id), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef("episodes"), data);
            
            // Auto update latest episode number
            try {
                await updateDoc(showRef, {
                    latestEpisodeNumber: data.number,
                    updatedAt: serverTimestamp()
                });
            } catch(e) { console.error("Auto update show failed", e); }
        }
    },

    async delete(id) {
        await deleteDoc(doc(getCollectionRef("episodes"), id));
    }
};

const EpisodeUI = {
    renderTable(data, onAction) {
        const tbody = document.getElementById('episode-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-500">ไม่พบตอน</td></tr>';
            return;
        }

        data.forEach(ep => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-700 hover:bg-gray-800 transition-colors";
            tr.innerHTML = `
                <td class="px-6 py-4 text-white">ตอนที่ ${ep.number}</td>
                <td class="px-6 py-4 text-gray-300 truncate max-w-xs">${ep.title || '-'}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded text-xs ${ep.isFree ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}">
                        ${ep.isFree ? 'ฟรี' : 'พรีเมียม'}
                    </span>
                </td>
                <td class="px-6 py-4 text-gray-400 text-sm font-mono text-center">${formatTimestamp(ep.updatedAt)}</td>
                <td class="px-6 py-4 text-right space-x-2">
                    <button class="bg-gray-700 hover:bg-gray-600 p-2 rounded text-gray-300 btn-edit" data-id="${ep.id}"><i class="fas fa-edit"></i></button>
                    <button class="bg-red-900/30 hover:bg-red-900/50 p-2 rounded text-red-400 btn-del" data-id="${ep.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-edit').forEach(b => b.onclick = () => onAction('edit', b.dataset.id));
        tbody.querySelectorAll('.btn-del').forEach(b => b.onclick = () => onAction('delete', b.dataset.id));
    },

    updatePagination(page, hasNext, hasPrev) {
        const btnNext = document.getElementById('next-page-ep');
        const btnPrev = document.getElementById('prev-page-ep');
        if(btnNext) btnNext.disabled = !hasNext;
        if(btnPrev) btnPrev.disabled = !hasPrev;
        const info = document.getElementById('page-info-ep');
        if(info) info.innerText = `หน้า ${page}`;
    },

    openModal(ep = null, showId = null) {
        const modal = document.getElementById('episode-modal');
        const form = document.getElementById('episode-form');
        form.reset();
        form.dataset.id = ep ? ep.id : '';
        form.dataset.showId = showId || (ep ? ep.showId : '');

        if (ep) {
            document.getElementById('ep-number').value = ep.number;
            document.getElementById('ep-title').value = ep.title || '';
            
            // Handle Players
            if(ep.players && Array.isArray(ep.players)) {
                ep.players.forEach((p, idx) => {
                    const prefix = idx === 0 ? 'main' : (idx === 1 ? 'backup1' : 'backup2');
                    const elUrl = document.getElementById(`ep-${prefix}-url`);
                    const elType = document.getElementById(`ep-${prefix}-type`);
                    if(elUrl) elUrl.value = p.url || '';
                    if(elType) elType.value = p.type || 'embed';
                });
            }
            document.getElementById('ep-is-free').checked = ep.isFree || false;
        }
        modal.classList.remove('hidden'); modal.classList.add('flex');
    },

    closeModal() {
        document.getElementById('episode-modal').classList.add('hidden');
        document.getElementById('episode-modal').classList.remove('flex');
    }
};

export function initEpisodeModule() {
    // Filter Show Change
    const filterShow = document.getElementById('filter-episode-show');
    
    // Load Shows for Dropdown
    loadShowOptions();

    const btnLoad = document.getElementById('btn-load-episodes');
    if(btnLoad) {
        const newBtn = btnLoad.cloneNode(true);
        btnLoad.parentNode.replaceChild(newBtn, btnLoad);
        newBtn.onclick = () => loadEpisodes('reset');
    }

    const btnAdd = document.getElementById('btn-add-episode');
    if(btnAdd) {
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.onclick = () => {
            const showId = document.getElementById('filter-episode-show').value;
            if(!showId) return showToast("กรุณาเลือกอนิเมะก่อน", "error");
            EpisodeUI.openModal(null, showId);
        };
    }

    const form = document.getElementById('episode-form');
    if(form) form.onsubmit = handleFormSubmit;

    // Pagination
    const btnNext = document.getElementById('next-page-ep');
    const btnPrev = document.getElementById('prev-page-ep');
    if(btnNext) btnNext.onclick = () => loadEpisodes('next');
    if(btnPrev) btnPrev.onclick = () => loadEpisodes('prev');
}

async function loadShowOptions() {
    try {
        const q = query(getCollectionRef("shows"), orderBy("updatedAt", "desc"));
        const snap = await getDocs(q);
        const select = document.getElementById('filter-episode-show');
        if(!select) return;
        
        const oldVal = select.value;
        select.innerHTML = '<option value="">-- เลือกอนิเมะ --</option>';
        snap.forEach(doc => {
            const op = document.createElement('option');
            op.value = doc.id;
            op.innerText = doc.data().title;
            select.appendChild(op);
        });
        if(oldVal) select.value = oldVal;
    } catch(e) { console.error(e); }
}

async function loadEpisodes(mode = 'reset') {
    const showId = document.getElementById('filter-episode-show').value;
    if(!showId) return;

    toggleLoading(true, "โหลดตอน...");
    try {
        const result = await EpisodeService.fetchList(showId, mode);
        EpisodeUI.renderTable(result.items, async (action, id) => {
            if(action === 'edit') {
                const epDoc = await getDoc(doc(getCollectionRef("episodes"), id));
                if(epDoc.exists()) EpisodeUI.openModal({id: epDoc.id, ...epDoc.data()});
            }
            if(action === 'delete') handleDelete(id);
        });
        EpisodeUI.updatePagination(result.page, result.hasNext, result.hasPrev);
    } catch(e) { showToast(e.message, 'error'); } 
    finally { toggleLoading(false); }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if(btn && btn.disabled) return;

    toggleLoading(true, "บันทึก...");
    if(btn) btn.disabled = true;

    try {
        const id = e.target.dataset.id;
        const showId = e.target.dataset.showId;
        
        const players = [];
        ['main', 'backup1', 'backup2'].forEach(prefix => {
            const url = document.getElementById(`ep-${prefix}-url`).value.trim();
            const type = document.getElementById(`ep-${prefix}-type`).value;
            if(url) players.push({ url, type });
        });

        const data = {
            showId,
            number: parseFloat(document.getElementById('ep-number').value),
            title: document.getElementById('ep-title').value.trim(),
            isFree: document.getElementById('ep-is-free').checked,
            players
        };

        await EpisodeService.save(id, data);
        showToast("บันทึกตอนสำเร็จ");
        EpisodeUI.closeModal();
        loadEpisodes();
    } catch(err) {
        showToast(err.message, 'error');
    } finally {
        toggleLoading(false);
        if(btn) btn.disabled = false;
    }
}

async function handleDelete(id) {
    showConfirmModal("ลบตอน", "ยืนยันการลบ?", async () => {
        toggleLoading(true, "กำลังลบ...");
        try {
            await EpisodeService.delete(id);
            showToast("ลบสำเร็จ");
            loadEpisodes();
        } catch(e) { showToast(e.message, 'error'); }
        finally { toggleLoading(false); }
    });
}
