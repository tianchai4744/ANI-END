import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getCountFromServer, setLogLevel, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, auth, appId } from "../../js/config/db-config.js";
import { getCollectionRef, showToast, showConfirmModal } from "./utils.js";

// Import Sub-Modules
import { initShowModule } from "./shows.js";
import { initEpisodeModule } from "./episodes.js";
import { initBannerModule } from "./banners.js";
import { initTagModule } from "./tags.js";
import { initReportModule } from "./reports.js";

setLogLevel('silent');

// Global Tab Switcher
window.switchTab = function(tabName) {
    ['dashboard', 'shows', 'episodes', 'banners', 'reports', 'tags'].forEach(t => {
        const el = document.getElementById(t + '-panel');
        if(el) t === tabName ? el.classList.remove('hidden') : el.classList.add('hidden');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-gray-800', 'text-white', 'shadow-md');
        btn.classList.add('text-gray-400');
    });
    const activeBtn = document.getElementById('tab-' + tabName);
    if(activeBtn) {
        activeBtn.classList.add('bg-gray-800', 'text-white', 'shadow-md');
        activeBtn.classList.remove('text-gray-400');
    }

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
    } catch(err) { console.error(err); }
}

window.fetchDashboardStats = fetchDashboardStats;

// --- AUTHENTICATION LOGIC (SECURITY FIXED) ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // [FIXED] ตรวจสอบสิทธิ์จาก Firestore แทนการ Hardcode Email
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
                
                document.getElementById('btn-logout')?.addEventListener('click', () => {
                    showConfirmModal('ออกจากระบบ', 'ยืนยัน?', async() => { await signOut(auth); window.location.reload(); });
                });
            } else {
                // กรณีล็อกอินแล้ว แต่ไม่ใช่ Admin
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
            <h1 class="text-3xl font-bold text-white mb-2">Admin Login</h1>
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

