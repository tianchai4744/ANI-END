import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc, writeBatch,
    query, orderBy, limit, startAfter, getDocs, serverTimestamp, where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js"; 
import { getCollectionRef, showToast, toggleLoading, showConfirmModal } from "./admin-utils.js";
import { generateKeywords, formatTimestamp } from "./utils.js";

let shows = [];
// Pagination & Sorting State
const SHOWS_PER_PAGE = 20;
let currentShowPage = 1;
let showCursors = [null]; // เก็บ Cursor สำหรับปุ่มย้อนกลับ
let currentSort = { field: 'updatedAt', dir: 'desc' };

export function initShowModule() {
    // Event Listeners
    document.getElementById('btn-search-show')?.addEventListener('click', () => fetchShows(true));
    document.getElementById('btn-reset-show')?.addEventListener('click', () => {
        document.getElementById('search-show').value = '';
        fetchShows(false);
    });
    document.getElementById('show-form')?.addEventListener('submit', handleShowSubmit);
    
    // Listeners สำหรับ Pagination
    document.getElementById('next-page-show')?.addEventListener('click', () => fetchShows(false, 'next'));
    document.getElementById('prev-page-show')?.addEventListener('click', () => fetchShows(false, 'prev'));

    // Bind Global Functions
    window.openShowModal = openShowModal; 
    
    // กู้คืนฟังก์ชัน Sort
    window.sortShows = (field) => {
        // Toggle direction
        if (currentSort.field === field) {
            currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = field;
            currentSort.dir = 'desc'; // Default desc for new field
        }
        fetchShows(false, 'reset');
    };

    // Initial Fetch
    fetchShows();
}

async function openShowModal(id = null) {
    const modal = document.getElementById('show-modal');
    const form = document.getElementById('show-form');
    form.reset();
    form.dataset.id = id || '';

    document.querySelectorAll('.show-tag-option').forEach(cb => cb.checked = false);

    if (id) {
        let show = shows.find(s => s.id === id);
        
        // ถ้าหาไม่เจอในหน้านี้ (Local State) ให้ไปดึงจาก Server โดยตรง
        if (!show) { 
            toggleLoading(true, "กำลังดึงข้อมูล...");
            try {
                const docSnap = await getDoc(doc(getCollectionRef("shows"), id));
                if (docSnap.exists()) {
                    show = { id: docSnap.id, ...docSnap.data() };
                } else {
                    showToast("ไม่พบข้อมูลอนิเมะ (อาจถูกลบไปแล้ว)", "error");
                    toggleLoading(false);
                    return;
                }
            } catch (e) {
                console.error("Error fetching show details:", e);
                showToast("เกิดข้อผิดพลาดในการดึงข้อมูล", "error");
                toggleLoading(false);
                return;
            }
            toggleLoading(false);
        }
        
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
    }
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

async function handleShowSubmit(e) {
    e.preventDefault();
    toggleLoading(true, "กำลังบันทึก...");
    const id = e.target.dataset.id;
    const title = document.getElementById('show-title').value.trim();
    
    const tags = Array.from(document.querySelectorAll('.show-tag-option:checked')).map(cb => cb.value);
    if(tags.length === 0) tags.push('อนิเมะ');

    const data = {
        title,
        description: document.getElementById('show-desc').value,
        thumbnailUrl: document.getElementById('show-thumbnail').value,
        viewCount: parseInt(document.getElementById('show-view-count').value) || 0,
        isCompleted: document.getElementById('show-completed').checked,
        tags: tags,
        keywords: generateKeywords(title),
        updatedAt: serverTimestamp()
    };

    try {
        if (id) await updateDoc(doc(getCollectionRef("shows"), id), data);
        else {
            data.createdAt = serverTimestamp();
            data.latestEpisodeNumber = 0;
            data.episodeCount = 0;
            await addDoc(getCollectionRef("shows"), data);
        }
        showToast('บันทึกสำเร็จ');
        document.getElementById('show-modal').classList.add('hidden');
        document.getElementById('show-modal').classList.remove('flex');
        
        // Refresh ข้อมูล: ถ้าแก้ไขให้โหลดหน้าเดิม ถ้าสร้างใหม่ให้รีเซ็ตไปหน้าแรก
        fetchShows(false, id ? 'current' : 'reset'); 
    } catch (err) { 
        console.error(err);
        showToast(err.message, 'error'); 
    } finally { 
        toggleLoading(false); 
    }
}

// ปรับปรุงฟังก์ชัน Fetch ให้รองรับ Pagination เต็มรูปแบบ
async function fetchShows(isSearch = false, mode = 'reset') {
    toggleLoading(true, "กำลังโหลดข้อมูล...");
    const tbody = document.getElementById('show-table-body');
    const btnNext = document.getElementById('next-page-show');
    const btnPrev = document.getElementById('prev-page-show');

    if (btnNext) btnNext.disabled = true;
    if (btnPrev) btnPrev.disabled = true;

    // Loading State UI
    if (mode === 'reset' || isSearch) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-400 animate-pulse">กำลังโหลด...</td></tr>';
    }
    
    try {
        let q;
        const colRef = getCollectionRef("shows");
        const baseQuery = query(colRef, orderBy(currentSort.field, currentSort.dir));
        const searchVal = document.getElementById('search-show').value.trim().toLowerCase();

        if (isSearch && searchVal) {
             q = query(colRef, where("keywords", "array-contains", searchVal), limit(SHOWS_PER_PAGE));
             currentShowPage = 1;
             showCursors = [null];
        } else {
             if (mode === 'reset') {
                q = query(baseQuery, limit(SHOWS_PER_PAGE));
                currentShowPage = 1;
                showCursors = [null];
            } else if (mode === 'next') {
                const prevCursor = showCursors[currentShowPage]; 
                if (prevCursor) {
                    q = query(baseQuery, startAfter(prevCursor), limit(SHOWS_PER_PAGE));
                    currentShowPage++;
                } else {
                    q = query(baseQuery, limit(SHOWS_PER_PAGE));
                }
            } else if (mode === 'prev') {
                if (currentShowPage > 1) {
                    currentShowPage--;
                    const cursor = showCursors[currentShowPage - 1]; 
                    if (cursor) {
                        q = query(baseQuery, startAfter(cursor), limit(SHOWS_PER_PAGE));
                    } else {
                        q = query(baseQuery, limit(SHOWS_PER_PAGE));
                    }
                }
            } else if (mode === 'current') {
                const cursor = showCursors[currentShowPage - 1];
                if (cursor) {
                     q = query(baseQuery, startAfter(cursor), limit(SHOWS_PER_PAGE));
                } else {
                     q = query(baseQuery, limit(SHOWS_PER_PAGE));
                }
            }
        }

        const snap = await getDocs(q);
        
        if (snap.empty && mode !== 'reset' && currentShowPage > 1) {
            currentShowPage--;
            fetchShows(false, 'current');
            return;
        }

        shows = snap.docs.map(d => ({id: d.id, ...d.data(), doc: d}));

        if(shows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-500">ไม่พบข้อมูล</td></tr>';
        } else {
            renderTable(shows);
            if (snap.docs.length === SHOWS_PER_PAGE) {
                showCursors[currentShowPage] = snap.docs[snap.docs.length - 1];
                if (btnNext) btnNext.disabled = false;
            }
        }

        const pageInfo = document.getElementById('page-info-show');
        if(pageInfo) pageInfo.textContent = `หน้า ${currentShowPage}`;
        
        if (btnPrev) btnPrev.disabled = (currentShowPage === 1);

    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">เกิดข้อผิดพลาด: ${e.message}</td></tr>`;
    } finally { toggleLoading(false); }
}

function renderTable(data) {
    const tbody = document.getElementById('show-table-body');
    tbody.innerHTML = '';
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
                <button class="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-xs btn-manage transition-colors" data-id="${s.id}" title="จัดการตอน"><i class="fas fa-list-ol"></i> ตอน</button>
                <button class="bg-gray-700 hover:bg-gray-600 p-2 rounded text-gray-300 btn-edit transition-colors" data-id="${s.id}" title="แก้ไข"><i class="fas fa-edit"></i></button>
                <button class="bg-red-900/30 hover:bg-red-900/50 p-2 rounded text-red-400 btn-del transition-colors" data-id="${s.id}" title="ลบ"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-manage').forEach(b => b.onclick = () => {
        window.switchTab('episodes'); 
        const select = document.getElementById('filter-episode-show');
        if(select) {
            select.value = b.dataset.id;
            const loadBtn = document.getElementById('btn-load-episodes');
            if(loadBtn) loadBtn.click();
        }
    });
    tbody.querySelectorAll('.btn-edit').forEach(b => b.onclick = () => openShowModal(b.dataset.id));
    tbody.querySelectorAll('.btn-del').forEach(b => b.onclick = () => deleteShow(b.dataset.id));
}

// --- ฟังก์ชันใหม่: ช่วยลบข้อมูลทีละ Batch ---
async function deleteCollectionInBatches(collectionName, fieldName, value) {
    const CHUNK_SIZE = 400; // ลบทีละ 400 รายการ
    let hasMore = true;
    let totalDeleted = 0;

    while (hasMore) {
        // 1. ดึงข้อมูลมาแค่ 400 ตัวแรกที่เจอ
        const q = query(
            getCollectionRef(collectionName), 
            where(fieldName, "==", value), 
            limit(CHUNK_SIZE)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            hasMore = false;
            break;
        }

        // 2. เตรียม Batch Delete
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 3. ยืนยันการลบ
        await batch.commit();
        totalDeleted += snapshot.size;
        
        // อัปเดตสถานะให้ Admin อุ่นใจว่าไม่ค้าง
        toggleLoading(true, `กำลังลบ ${collectionName}... ลบไปแล้ว ${totalDeleted} รายการ`);
    }
}

// ฟังก์ชันลบหลักที่ปรับปรุงแล้ว
async function deleteShow(id) {
    showConfirmModal('ลบอนิเมะ', 'ยืนยันการลบ? ข้อมูลทั้งหมดที่เกี่ยวข้องจะหายไปถาวร', async () => {
        toggleLoading(true, "กำลังเริ่มกระบวนการลบ...");
        try {
            // ลบทีละ Collection เพื่อความปลอดภัยและไม่กินแรม
            await deleteCollectionInBatches("episodes", "showId", id);
            await deleteCollectionInBatches("banners", "showId", id);
            await deleteCollectionInBatches("reports", "showId", id);
            await deleteCollectionInBatches("comments", "showId", id);

            // สุดท้าย ลบตัวอนิเมะเอง
            await deleteDoc(doc(getCollectionRef("shows"), id));

            showToast('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
            fetchShows(false, 'current');
            if(window.fetchDashboardStats) window.fetchDashboardStats();

        } catch(e) { 
            console.error(e);
            showToast("เกิดข้อผิดพลาด: " + e.message, 'error'); 
        } finally { 
            toggleLoading(false); 
        }
    });
}
