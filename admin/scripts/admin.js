// admin/scripts/admin.js

import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getCountFromServer, setLogLevel, doc, getDoc } from "firebase/firestore";

// ✅ ใช้ Chart.js แบบ ESM CDN (ทำงานได้เลยบน GitHub Pages ไม่ต้องลง npm)
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm";

import { db, auth, appId } from "../../js/config/db-config.js";
import { getCollectionRef, showToast, showConfirmModal } from "./utils.js";

// Import Sub-Modules
import { initShowModule } from "./shows.js";
import { initEpisodeModule } from "./episodes.js";
import { initBannerModule } from "./banners.js";
import { initTagModule } from "./tags.js";
import { initReportModule } from "./reports.js";

setLogLevel('silent');

let epChart = null;
let tagChart = null;

// Global Tab Switcher
window.switchTab = function(tabName) {
    ['dashboard', 'shows', 'episodes', 'banners', 'reports', 'tags'].forEach(t => {
        const el = document.getElementById(t + '-panel');
        if(el) t === tabName ? el.classList.remove('hidden') : el.classList.add('hidden');
    });
    
    // Update Sidebar Active State
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
        
        const badge = document.getElementById('report-badge');
        if(badge) {
            badge.innerText = r.data().count;
            badge.classList.toggle('hidden', r.data().count === 0);
        }

        // Render Charts
        renderCharts();

    } catch(err) { console.error(err); }
}

function renderCharts() {
    // 1. Episodes Chart
    const ctxEp = document.getElementById('chart-episodes');
    if (ctxEp) {
        if (epChart) epChart.destroy();
        epChart = new Chart(ctxEp, {
            type: 'line',
            data: {
                labels: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'],
                datasets: [{
                    label: 'ตอนที่เพิ่มใหม่',
                    data: [12, 19, 3, 5, 2, 3, 10], // (Mockup Data)
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

    // 2. Tags Chart
    const ctxTag = document.getElementById('chart-tags');
    if (ctxTag) {
        if (tagChart) tagChart.destroy();
        tagChart = new Chart(ctxTag, {
            type: 'doughnut',
            data: {
                labels: ['Action', 'Romance', 'Fantasy', 'Isekai', 'Drama'],
                datasets: [{
                    data: [35, 20, 25, 15, 5], // (Mockup Data)
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

// --- AUTHENTICATION LOGIC ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = doc(db, `artifacts/${appId}/users/${user.uid}`);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().role === 'admin') {
                console.log("Admin Logged In:", user.email);
                removeLoginOverlay();

                fetchDashboardStats();
                
                initShowModule();
                initEpisodeModule();
                initBannerModule();
                initTagModule();
                initReportModule();
                
                setInterval(fetchDashboardStats, 60000);
                
                const logoutBtn = document.getElementById('btn-logout');
                if(logoutBtn) {
                    const newBtn = logoutBtn.cloneNode(true);
                    logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
                    newBtn.addEventListener('click', () => {
                        showConfirmModal('ออกจากระบบ', 'ยืนยัน?', async() => { await signOut(auth); window.location.reload(); });
                    });
                }
                
                switchTab('dashboard');

            } else {
                showToast("บัญชีของคุณไม่มีสิทธิ์ Admin", "error");
                await signOut(auth);
                showLoginOverlay();
            }
        } catch (error) {
            console.error("Admin check error:", error);
            showToast("เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์", "error");
            showLoginOverlay();
        }
    } else {
        showLoginOverlay();
    }
});

function showLoginOverlay() {
    if (document.getElementById('admin-login-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'admin-login-overlay';
    overlay.className = "fixed inset-0 bg-[#0f172a] z-[9999] flex flex-col items-center justify-center p-4";
    overlay.innerHTML = `
        <div class="bg-[#1e293b] p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-sm w-full text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <h1 class="text-3xl font-bold text-white mb-2 tracking-tight">ANI-END Admin</h1>
            <p class="text-slate-400 mb-8 text-sm">เข้าสู่ระบบเพื่อจัดการเนื้อหาเว็บไซต์</p>
            
            <button id="btn-admin-login" class="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-6 rounded-xl transition-all transform hover:-translate-y-1 shadow-lg">
                <i class="fab fa-google text-xl text-rose-600"></i>
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
