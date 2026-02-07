// admin/scripts/admin.js

import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getCountFromServer, setLogLevel, doc, getDoc } from "firebase/firestore";

// ✅ แก้ไข: ใช้ CDN Import (ไม่ต้องลง npm install)
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/auto/+esm";

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
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active', 'text-indigo-400', 'bg-gray-800'));
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
        
        // Update Badge
        const badge = document.getElementById('report-badge');
        if(badge) {
            badge.innerText = r.data().count;
            badge.classList.toggle('hidden', r.data().count === 0);
        }

        // Render Charts (Mockup Data)
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
                    data: [12, 19, 3, 5, 2, 3, 10], // Mock Data
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
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
                    data: [30, 20, 25, 15, 10], // Mock Data
                    backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#cbd5e1' } } }
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
                
                // Initialize Sub-Modules
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
                
                // Default Tab
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
    overlay.className = "fixed inset-0 bg-gray-900 z-[9999] flex flex-col items-center justify-center p-4";
    overlay.innerHTML = `
        <div class="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 max-w-sm w-full text-center">
            <h1 class="text-3xl font-bold text-white mb-2">ANI-END Admin</h1>
            <p class="text-gray-400 mb-8">กรุณาเข้าสู่ระบบเพื่อจัดการเว็บไซต์</p>
            
            <button id="btn-admin-login" class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg">
                <i class="fab fa-google text-xl text-red-600"></i>
                เข้าสู่ระบบด้วย Google
            </button>
            <p class="mt-6 text-xs text-gray-500">เฉพาะผู้ดูแลระบบที่มีสิทธิ์เท่านั้น</p>
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
