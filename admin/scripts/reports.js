import { 
    doc, deleteDoc, query, orderBy, limit, startAfter, getDocs, getDoc 
} from "firebase/firestore";

// ✅ แก้ไข Import
import { getCollectionRef, showToast, showConfirmModal, toggleLoading } from "./utils.js";
import { formatTimestamp } from "../../js/utils/tools.js";

// --- Global Variables for Reports ---
let reportsList = [];
const REPORTS_PER_PAGE = 20;
let currentReportPage = 1;
let reportCursors = [null]; // เก็บ Cursor สำหรับ Pagination

export function initReportModule() {
    // Event Listeners
    document.getElementById('next-page-report')?.addEventListener('click', () => fetchReports('next'));
    document.getElementById('prev-page-report')?.addEventListener('click', () => fetchReports('prev'));
    document.getElementById('btn-refresh-reports')?.addEventListener('click', () => fetchReports('reset'));
}

// Global Function ให้ admin.js เรียกใช้ตอนสลับแท็บ
window.fetchReports = async function(mode = 'reset') {
    const btnNext = document.getElementById('next-page-report');
    const btnPrev = document.getElementById('prev-page-report');
    const tbody = document.getElementById('report-table-body');
    
    if (btnNext) btnNext.disabled = true;
    if (btnPrev) btnPrev.disabled = true;
    
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-400">กำลังโหลดข้อมูล...</td></tr>';

    try {
        const colRef = getCollectionRef("reports");
        const baseQuery = query(colRef, orderBy("createdAt", "desc"));
        let q;

        if (mode === 'reset') {
            q = query(baseQuery, limit(REPORTS_PER_PAGE));
            currentReportPage = 1;
            reportCursors = [null];
        } else if (mode === 'next') {
            const cursor = reportCursors[currentReportPage];
            if (cursor) {
                q = query(baseQuery, startAfter(cursor), limit(REPORTS_PER_PAGE));
                currentReportPage++;
            } else {
                q = query(baseQuery, limit(REPORTS_PER_PAGE));
            }
        } else if (mode === 'prev') {
            if (currentReportPage > 1) {
                currentReportPage--;
                const cursor = reportCursors[currentReportPage - 1];
                if (cursor) {
                    q = query(baseQuery, startAfter(cursor), limit(REPORTS_PER_PAGE));
                } else {
                    q = query(baseQuery, limit(REPORTS_PER_PAGE));
                }
            }
        } else { // Current refresh
            const cursor = reportCursors[currentReportPage - 1];
             if (cursor) {
                q = query(baseQuery, startAfter(cursor), limit(REPORTS_PER_PAGE));
            } else {
                q = query(baseQuery, limit(REPORTS_PER_PAGE));
            }
        }

        const snapshot = await getDocs(q);
        
        if (snapshot.empty && mode !== 'reset' && currentReportPage > 1) {
             currentReportPage--;
             window.fetchReports('current');
             return;
        }

        if (snapshot.empty) {
            if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">ไม่พบรายงานปัญหา</td></tr>`;
        } else {
            // ดึงข้อมูล Title ของ Show มาแสดงด้วย (เพราะ Report เก็บแค่ showId)
            const reportsWithTitles = await Promise.all(snapshot.docs.map(async (d) => {
                const data = d.data();
                let showTitle = 'Unknown Show';
                if (data.showId) {
                    try {
                        const showSnap = await getDoc(doc(getCollectionRef("shows"), data.showId));
                        if (showSnap.exists()) showTitle = showSnap.data().title;
                    } catch (e) { console.warn("Fetch show title error", e); }
                }
                return { id: d.id, ...data, showTitle, doc: d };
            }));
            
            reportsList = reportsWithTitles;
            renderReportTable(reportsList);
            
             if (snapshot.docs.length === REPORTS_PER_PAGE) {
                reportCursors[currentReportPage] = snapshot.docs[snapshot.docs.length - 1];
                if(btnNext) btnNext.disabled = false;
            } else {
                if(btnNext) btnNext.disabled = true;
            }
        }
        
        const pageInfo = document.getElementById('page-info-report');
        if(pageInfo) pageInfo.textContent = `หน้า ${currentReportPage}`;
        if(btnPrev) btnPrev.disabled = (currentReportPage === 1);
        
    } catch (error) {
        console.error(error);
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-400">Error: ${error.message}</td></tr>`;
    }
};

function renderReportTable(data) {
    const tbody = document.getElementById('report-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
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
        btn.addEventListener('click', () => deleteReport(btn.dataset.id));
    });
}

function deleteReport(id) {
    showConfirmModal('ลบรายงาน', 'ยืนยันการลบรายงานนี้?', async() => {
        try {
            await deleteDoc(doc(getCollectionRef("reports"), id));
            showToast("ลบรายงานเรียบร้อย");
            window.fetchReports('current');
            // อัปเดตตัวเลข Dashboard ถ้าจำเป็น
            if(window.fetchDashboardStats) window.fetchDashboardStats();
        } catch(e) {
            showToast(e.message, 'error');
        }
    });
}
