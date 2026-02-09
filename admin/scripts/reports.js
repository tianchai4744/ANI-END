// admin/scripts/reports.js
import { doc, deleteDoc, query, orderBy, limit, startAfter, getDocs, getDoc } from "firebase/firestore";
import { getCollectionRef, showToast, showConfirmModal, toggleLoading } from "./utils.js";
import { formatTimestamp } from "../../js/utils/tools.js";

// --- 🧠 SERVICE LAYER (Business Logic) ---
const ReportService = {
    cursors: [null],
    currentPage: 1,
    PER_PAGE: 20,

    resetPagination() {
        this.currentPage = 1;
        this.cursors = [null];
    },

    async fetchList(mode = 'reset') {
        const colRef = getCollectionRef("reports");
        const baseQuery = query(colRef, orderBy("createdAt", "desc"));
        let q;

        // Pagination Logic
        if (mode === 'reset') {
            this.resetPagination();
            q = query(baseQuery, limit(this.PER_PAGE));
        } else if (mode === 'next') {
            const cursor = this.cursors[this.currentPage];
            q = cursor ? query(baseQuery, startAfter(cursor), limit(this.PER_PAGE)) : query(baseQuery, limit(this.PER_PAGE));
            if (cursor) this.currentPage++;
        } else if (mode === 'prev') {
            if (this.currentPage > 1) {
                this.currentPage--;
                const cursor = this.cursors[this.currentPage - 1];
                q = cursor ? query(baseQuery, startAfter(cursor), limit(this.PER_PAGE)) : query(baseQuery, limit(this.PER_PAGE));
            }
        } else { // Current refresh
            const cursor = this.cursors[this.currentPage - 1];
            q = cursor ? query(baseQuery, startAfter(cursor), limit(this.PER_PAGE)) : query(baseQuery, limit(this.PER_PAGE));
        }

        const snapshot = await getDocs(q);

        // Handle empty page edge case
        if (snapshot.empty && mode !== 'reset' && this.currentPage > 1) {
            this.currentPage--;
            return await this.fetchList('current');
        }

        // Store next cursor
        if (snapshot.docs.length === this.PER_PAGE) {
            this.cursors[this.currentPage] = snapshot.docs[snapshot.docs.length - 1];
        }

        // Enrich Data with Show Titles
        const items = await Promise.all(snapshot.docs.map(async (d) => {
            const data = d.data();
            let showTitle = 'Unknown Show';
            if (data.showId) {
                try {
                    const showSnap = await getDoc(doc(getCollectionRef("shows"), data.showId));
                    if (showSnap.exists()) showTitle = showSnap.data().title;
                } catch (e) { console.warn("Fetch show title error", e); }
            }
            return { id: d.id, ...data, showTitle };
        }));

        return {
            items,
            page: this.currentPage,
            hasNext: snapshot.docs.length === this.PER_PAGE,
            hasPrev: this.currentPage > 1
        };
    },

    async delete(id) {
        await deleteDoc(doc(getCollectionRef("reports"), id));
    }
};

// --- 🎨 UI LAYER (View) ---
const ReportUI = {
    renderTable(data, onDelete) {
        const tbody = document.getElementById('report-table-body');
        if(!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">ไม่พบรายงานปัญหา</td></tr>`;
            return;
        }

        data.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-700/50 border-b border-gray-700/50";
            tr.innerHTML = `
                <td class="px-6 py-4 text-sm text-white">${r.showTitle}</td>
                <td class="px-6 py-4 text-sm text-gray-300">Ep ID: ...${r.episodeId ? r.episodeId.slice(-5) : '-'}</td>
                <td class="px-6 py-4 text-sm text-rose-400 font-medium">${r.reason || 'User Report'}</td>
                <td class="px-6 py-4 text-sm text-gray-400">${formatTimestamp(r.createdAt)}</td>
                <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                    <button class="text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 p-1.5 rounded-md transition-all btn-del-report" data-id="${r.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach Event Listeners
        tbody.querySelectorAll('.btn-del-report').forEach(btn => {
            btn.addEventListener('click', () => onDelete(btn.dataset.id));
        });
    },

    renderPagination(page, hasNext, hasPrev) {
        const btnNext = document.getElementById('next-page-report');
        const btnPrev = document.getElementById('prev-page-report');
        const pageInfo = document.getElementById('page-info-report');
        
        if(pageInfo) pageInfo.textContent = `หน้า ${page}`;
        if(btnNext) btnNext.disabled = !hasNext;
        if(btnPrev) btnPrev.disabled = !hasPrev;
    },

    renderLoading() {
        const tbody = document.getElementById('report-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-400">กำลังโหลดข้อมูล...</td></tr>';
        
        const btnNext = document.getElementById('next-page-report');
        const btnPrev = document.getElementById('prev-page-report');
        if(btnNext) btnNext.disabled = true;
        if(btnPrev) btnPrev.disabled = true;
    },

    renderError(msg) {
        const tbody = document.getElementById('report-table-body');
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-400">Error: ${msg}</td></tr>`;
    }
};

// --- 🎮 CONTROLLER ---
export function initReportModule() {
    // Event Listeners
    document.getElementById('next-page-report')?.addEventListener('click', () => fetchReports('next'));
    document.getElementById('prev-page-report')?.addEventListener('click', () => fetchReports('prev'));
    document.getElementById('btn-refresh-reports')?.addEventListener('click', () => fetchReports('reset'));
}

// Global Access Function
window.fetchReports = async function(mode = 'reset') {
    ReportUI.renderLoading();
    try {
        const result = await ReportService.fetchList(mode);
        ReportUI.renderTable(result.items, (id) => handleDelete(id));
        ReportUI.renderPagination(result.page, result.hasNext, result.hasPrev);
    } catch (error) {
        console.error(error);
        ReportUI.renderError(error.message);
    }
};

function handleDelete(id) {
    showConfirmModal('ลบรายงาน', 'ยืนยันการลบรายงานนี้?', async() => {
        try {
            await ReportService.delete(id);
            showToast("ลบรายงานเรียบร้อย");
            window.fetchReports('current');
            if(window.fetchDashboardStats) window.fetchDashboardStats();
        } catch(e) {
            showToast(e.message, 'error');
        }
    });
}
