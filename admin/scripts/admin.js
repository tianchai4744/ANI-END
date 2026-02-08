// admin/scripts/admin.js

import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getCountFromServer, setLogLevel, doc, getDoc, query, orderBy, limit, getDocs } from "firebase/firestore";

// ไม่ต้อง Import Chart เพราะใช้ Script Tag แล้ว
import { db, auth, appId } from "../../js/config/db-config.js";
import { getCollectionRef, showToast, showConfirmModal } from "./utils.js";
import { formatTimestamp } from "../../js/utils/tools.js"; 

// Import Sub-Modules
import { initShowModule } from "./shows.js";
import { initEpisodeModule } from "./episodes.js";
import { initBannerModule } from "./banners.js";
import { initTagModule } from "./tags.js";
import { initReportModule } from "./reports.js";

// ==========================================
// ⚠️ ตั้งค่า: ใส่อีเมล Admin หลักของคุณที่นี่
// ==========================================
const MAIN_ADMIN_EMAIL = 'YOUR_EMAIL@GMAIL.COM'; 
// ==========================================

setLogLevel('silent');

let epChart = null;
let tagChart = null;

// Global Tab Switcher
window.switchTab = function(tabName) {
    ['dashboard', 'shows', 'episodes', 'banners', 'reports', 'tags'].forEach(t => {
        const el = document.getElementById(t + '-panel');
        if(el) t === tabName ? el.classList.remove('hidden') : el.classList.add('hidden');
    });
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active', 'text-indigo-400', 'bg-slate-800'));
    const activeBtn = document.getElementById('tab-' + tabName);
    if(activeBtn) activeBtn.classList.add('active');

    if(tabName === 'dashboard') fetchDashboardStats();
    if(tabName === 'reports' && window.fetchReports) window.fetchReports('reset');
};

async function fetchDashboardStats() {
    try {
        const [s, e, r] = await Promise.all([
            getCountFromServer(getCollectionRef("shows")),
            getCountFromServer(getCollectionRef("episodes")),
            getCountFromServer(getCollectionRef("reports"))
        ]);
        
        document.getElementById('stat-total-shows').innerText = s.data().count;
        document.getElementById('stat-total-episodes').innerText = e.data().count;
        document.getElementById('stat-total-reports').innerText = r.data().count;
        
        // --- Badge Logic ---
        updateBadges(r.data().count);

        // Render Charts & Recent List
        renderCharts();
        fetchRecentActivity();

    } catch(err) { console.error(err); }
}

function updateBadges(count) {
    const sidebarBadge = document.getElementById('sidebar-report-badge');
    if (sidebarBadge) {
        sidebarBadge.innerText = count;
        if (count > 0) {
            sidebarBadge.classList.remove('hidden');
            sidebarBadge.classList.add('badge-pulse');
        } else {
            sidebarBadge.classList.add('hidden');
            sidebarBadge.classList.remove('badge-pulse');
        }
    }

    const dashBadge = document.getElementById('dashboard-report-badge');
    if (dashBadge) {
        if (count > 0) {
            dashBadge.innerText = `${count} New!`;
            dashBadge.classList.remove('hidden');
        } else {
            dashBadge.classList.add('hidden');
        }
    }
}

async function fetchRecentActivity() {
    const list = document.getElementById('recent-activity-list');
    if (!list) return;

    try {
        const q = query(getCollectionRef("shows"), orderBy("updatedAt", "desc"), limit(5));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            list.innerHTML = '<p class="text-slate-500 text-sm text-center py-4">ยังไม่มีการเคลื่อนไหว</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `
                <div class="flex items-center space-x-3 p-2 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer" onclick="openShowModal('${doc.id}')">
                    <img src="${data.thumbnailUrl}" class="w-10 h-14 rounded object-cover bg-slate-800" onerror="this.src='https://placehold.co/40x60'">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-white truncate">${data.title}</p>
                        <p class="text-xs text-slate-400">อัปเดต: ${formatTimestamp(data.updatedAt)}</p>
                    </div>
                    <div class="text-xs text-indigo-400 font-bold bg-indigo-400/10 px-2 py-1 rounded">
                        Ep.${data.latestEpisodeNumber || 0}
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;

    } catch (e) {
        console.error("Recent Activity Error:", e);
        list.innerHTML = '<p class="text-rose-500 text-xs">โหลดข้อมูลไม่สำเร็จ</p>';
    }
}

function renderCharts() {
    if (typeof window.Chart === 'undefined') return;

    // Episodes Chart
    const ctxEp = document.getElementById('chart-episodes');
    if (ctxEp) {
        if (epChart) epChart.destroy();
        epChart = new window.Chart(ctxEp, {
            type: 'line',
            data: {
                labels: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'],
                datasets: [{
                    label: 'ตอนที่เพิ่มใหม่',
                    data: [12, 19, 3, 5, 2, 3, 10], 
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, border: { display: false } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' }, border: { display: false } }
                }
            }
        });
    }

    // Tags Chart
    const ctxTag = document.getElementById('chart-tags');
    if (ctxTag) {
        if (tagChart) tagChart.destroy();
        tagChart = new window.Chart(ctxTag, {
            type: 'doughnut',
            data: {
                labels: ['Action', 'Romance', 'Fantasy', 'Isekai', 'Drama'],
                datasets: [{
                    data: [35, 20, 25, 15, 5],
                    backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { 
                    legend: { position: 'right', labels: { color: '#cbd5e1', padding: 20, usePointStyle: true } } 
                }
            }
        });
    }
}

window.fetchDashboardStats = fetchDashboardStats;

// --- AUTHENTICATION & SECURITY LOGIC (IMPROVED) ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ✅ 1. ตรวจสอบอีเมลหลักทันที (เร็วที่สุด + ปลอดภัย + ประหยัด Quota)
        if (user.email === MAIN_ADMIN_EMAIL) {
            grantAdminAccess(user);
            return;
        }

        try {
            // ✅ 2. ตรวจสอบ Custom Claims (ถ้ามีการตั้งค่าไว้)
            const token = await user.getIdTokenResult();
            if (token.claims.role === 'admin') {
                grantAdminAccess(user);
                return;
            }

            // ✅ 3. ตรวจสอบ Firestore Database (Fallback สุดท้าย)
            const userRef = doc(db, `artifacts/${appId}/users/${user.uid}`);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().role === 'admin') {
                grantAdminAccess(user);
            } else {
                // ⛔ ไม่ใช่ Admin: ดีดออกไปหน้าแรก
                handleUnauthorized();
            }
        } catch (error) {
            console.error("Admin check error:", error);
            handleUnauthorized();
        }
    } else {
        showLoginOverlay();
    }
});

function grantAdminAccess(user) {
    console.log("Admin Access Granted:", user.email);
    removeLoginOverlay();

    // เริ่มต้นโหลดข้อมูล (Load เมื่อผ่านสิทธิ์เท่านั้น เพื่อ Performance)
    fetchDashboardStats(); 
    initShowModule();
    initEpisodeModule();
    initBannerModule();
    initTagModule();
    initReportModule();
    
    // Auto Refresh Dashboard ทุก 1 นาที
    setInterval(fetchDashboardStats, 60000); 
    
    // ตั้งค่าปุ่ม Logout
    const logoutBtn = document.getElementById('btn-logout');
    if(logoutBtn) {
        const newBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
        newBtn.addEventListener('click', () => {
            showConfirmModal('ออกจากระบบ', 'ยืนยัน?', async() => { 
                await signOut(auth); 
                window.location.reload(); 
            });
        });
    }
    
    switchTab('dashboard');
}

async function handleUnauthorized() {
    showToast("คุณไม่มีสิทธิ์เข้าถึงหน้านี้", "error");
    await signOut(auth);
    
    // รอ 1.5 วินาทีแล้วดีดกลับหน้าเว็บหลัก
    setTimeout(() => {
        window.location.href = "/";
    }, 1500);
}

function showLoginOverlay() {
    if (document.getElementById('admin-login-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'admin-login-overlay';
    overlay.className = "fixed inset-0 bg-[#0f172a] z-[9999] flex flex-col items-center justify-center p-4";
    overlay.innerHTML = `
        <div class="bg-[#1e293b] p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-sm w-full text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <h1 class="text-3xl font-bold text-white mb-2 tracking-tight">ANI-END Admin</h1>
            <p class="text-slate-400 mb-8 text-sm">ระบบจัดการหลังบ้านสำหรับผู้ดูแล</p>
            
            <button id="btn-admin-login" class="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-6 rounded-xl transition-all transform hover:-translate-y-1 shadow-lg">
                <i class="ri-google-fill text-xl text-rose-600"></i>
                เข้าสู่ระบบด้วย Google
            </button>
            <p class="mt-8 text-xs text-slate-500">สำหรับผู้ดูแลระบบที่มีสิทธิ์เท่านั้น</p>
        </div>
    `;
    
    document.body.appendChild(overlay);

    document.getElementById('btn-admin-login').onclick = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            showToast("เข้าสู่ระบบล้มเหลว: " + error.message, 'error');
        }
    };
}

function removeLoginOverlay() {
    const overlay = document.getElementById('admin-login-overlay');
    if (overlay) overlay.remove();
}
