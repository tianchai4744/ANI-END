// navbar.js
import { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    resetPasswordEmail,
    logoutUser, 
    monitorUserAuth,
    getAuthErrorMessage 
} from "./auth-user.js";
import { collection, getDocs, limit, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, appId } from "./firebase-config.js";

// --- Toast Notification System ---
window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 w-full p-4 rounded-lg shadow-xl border-l-4 toast-enter transition-all ${
        type === 'success' ? 'bg-gray-800 border-green-500 text-white' : 
        type === 'error' ? 'bg-gray-800 border-red-500 text-white' : 'bg-gray-800 border-blue-500 text-white'
    }`;
    
    const iconClass = type === 'success' ? 'ri-checkbox-circle-fill text-green-500 text-xl' : 
                      type === 'error' ? 'ri-error-warning-fill text-red-500 text-xl' : 'ri-information-fill text-blue-500 text-xl';

    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <div class="text-sm font-medium">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

window.triggerLogin = () => {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');
    if(modal && content) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0', 'pointer-events-none');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        });
    }
};

// [NEW] Helper Functions for UI State
function setUIStateLoggedIn(userData) {
    const { name, photo } = userData;
    
    // Desktop
    document.getElementById('btn-login-google')?.classList.add('hidden');
    const profile = document.getElementById('user-profile');
    if (profile) {
        profile.classList.remove('hidden');
        document.getElementById('user-avatar').src = photo;
        document.getElementById('user-name').textContent = name;
        if(document.getElementById('user-name-dropdown')) 
            document.getElementById('user-name-dropdown').textContent = name;
    }

    // Mobile
    document.getElementById('btn-login-google-mobile')?.classList.add('hidden');
    const mProfile = document.getElementById('mobile-user-profile');
    if (mProfile) {
        mProfile.classList.remove('hidden');
        document.getElementById('mobile-user-avatar').src = photo;
        document.getElementById('mobile-user-name').textContent = name;
    }
}

function setUIStateLoggedOut() {
    // Desktop
    document.getElementById('btn-login-google')?.classList.remove('hidden');
    document.getElementById('user-profile')?.classList.add('hidden');

    // Mobile
    document.getElementById('btn-login-google-mobile')?.classList.remove('hidden');
    document.getElementById('mobile-user-profile')?.classList.add('hidden');
}

export async function loadNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    if (!placeholder.hasChildNodes()) {
        placeholder.innerHTML = `<header class="bg-gray-900/95 h-16 sticky top-0 z-50"></header>`;
    }

    try {
        const response = await fetch('navbar.html');
        if (!response.ok) throw new Error('Failed');
        const html = await response.text();
        placeholder.innerHTML = html;
        
        // [IMPORTANT] Optimistic UI Check (ทำงานทันทีหลังโหลด HTML ไม่รอ Firebase)
        const cachedUser = localStorage.getItem('ani_user_cache');
        if (cachedUser) {
            try {
                const userData = JSON.parse(cachedUser);
                setUIStateLoggedIn(userData); // แสดงโปรไฟล์ทันที
            } catch(e) {
                localStorage.removeItem('ani_user_cache');
                setUIStateLoggedOut();
            }
        } else {
            setUIStateLoggedOut(); // แสดงปุ่มล็อกอินทันที
        }

        setupNavbarEvents();
        setupAuthEvents();     
        setupAuthModalLogic();
        highlightActiveLink(); 
    } catch (error) {
        console.error("Navbar load error:", error);
    }
}

// --- Notification System ---
async function checkNotifications(userId) {
    const btn = document.getElementById('btn-notification');
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notification-list');
    const dropdown = document.getElementById('notification-dropdown');

    if (!btn || !badge || !list || !dropdown) return;

    try {
        const bookmarksRef = collection(db, `artifacts/${appId}/users/${userId}/bookmarks`);
        const bookmarksSnap = await getDocs(query(bookmarksRef, limit(20)));
        
        if (bookmarksSnap.empty) return;

        let notifications = [];
        
        const historyRef = collection(db, `artifacts/${appId}/users/${userId}/viewHistory`);
        const historySnap = await getDocs(query(historyRef));
        const historyMap = new Map();
        historySnap.forEach(doc => historyMap.set(doc.data().showId, doc.data().lastWatchedEpisodeNumber || 0));

        for (const docSnap of bookmarksSnap.docs) {
            const bm = docSnap.data();
            const showId = docSnap.id;
            
            const showDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/shows`, showId));
            if (!showDoc.exists()) continue;
            
            const showData = showDoc.data();
            const latestEp = showData.latestEpisodeNumber || 0;
            const lastWatched = historyMap.get(showId) || 0;

            if (latestEp > lastWatched) {
                notifications.push({
                    title: showData.title,
                    ep: latestEp,
                    id: showId,
                    thumbnail: showData.thumbnailUrl
                });
            }
        }

        if (notifications.length > 0) {
            badge.textContent = notifications.length;
            badge.classList.remove('hidden');
            
            let html = '';
            notifications.forEach(n => {
                html += `
                    <a href="player.html?id=${n.id}&ep_id=latest" class="block p-3 hover:bg-gray-700 border-b border-gray-700 last:border-0 flex gap-3 items-center">
                        <img src="${n.thumbnail}" class="w-10 h-14 object-cover rounded bg-gray-700">
                        <div class="min-w-0">
                            <p class="text-xs text-green-400 font-bold">ตอนใหม่! ตอนที่ ${n.ep}</p>
                            <p class="text-sm text-white truncate">${n.title}</p>
                        </div>
                    </a>
                `;
            });
            list.innerHTML = html;
        } else {
             badge.classList.add('hidden');
        }

        btn.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        };
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

    } catch (e) {
        console.error("Notif Error:", e);
    }
}

function setupAuthModalLogic() {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');
    const btnClose = document.getElementById('btn-close-auth');
    const btnGoogle = document.getElementById('btn-auth-google');
    const form = document.getElementById('email-auth-form');
    
    // UI Elements
    const title = document.getElementById('auth-modal-title');
    const icon = document.getElementById('auth-icon');
    const nameField = document.getElementById('field-name-container');
    const passwordField = document.getElementById('field-password-container');
    const socialSection = document.getElementById('social-auth-section');
    const authFooter = document.getElementById('auth-footer');
    
    const nameInput = document.getElementById('auth-name');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const submitBtn = document.getElementById('btn-submit-auth');
    
    const btnSwitch = document.getElementById('btn-switch-mode');
    const switchText = document.getElementById('auth-switch-text');
    const btnForgot = document.getElementById('btn-forgot-password');
    const btnBackLogin = document.getElementById('btn-back-login');

    let mode = 'login'; 

    const updateUI = () => {
        nameInput.required = (mode === 'register');
        passwordInput.required = (mode !== 'forgot');

        if (mode === 'login') {
            title.textContent = "เข้าสู่ระบบ";
            icon.className = "ri-login-circle-line text-green-500";
            nameField.classList.add('hidden');
            passwordField.classList.remove('hidden');
            socialSection.classList.remove('hidden');
            authFooter.classList.remove('hidden');
            btnBackLogin.classList.add('hidden');
            submitBtn.innerHTML = 'เข้าสู่ระบบ';
            switchText.textContent = "ยังไม่มีบัญชี?";
            btnSwitch.textContent = "สมัครสมาชิกฟรี";
            
        } else if (mode === 'register') {
            title.textContent = "สมัครสมาชิกใหม่";
            icon.className = "ri-user-add-line text-green-500";
            nameField.classList.remove('hidden');
            passwordField.classList.remove('hidden');
            socialSection.classList.remove('hidden');
            authFooter.classList.remove('hidden');
            btnBackLogin.classList.add('hidden');
            submitBtn.innerHTML = 'สมัครสมาชิก';
            switchText.textContent = "มีบัญชีอยู่แล้ว?";
            btnSwitch.textContent = "เข้าสู่ระบบ";

        } else if (mode === 'forgot') {
            title.textContent = "รีเซ็ตรหัสผ่าน";
            icon.className = "ri-lock-unlock-line text-yellow-500";
            nameField.classList.add('hidden');
            passwordField.classList.add('hidden');
            socialSection.classList.add('hidden'); 
            authFooter.classList.add('hidden');    
            btnBackLogin.classList.remove('hidden');
            submitBtn.innerHTML = 'ส่งลิงก์รีเซ็ต';
        }
    };

    if (btnSwitch) btnSwitch.onclick = () => { mode = (mode === 'login') ? 'register' : 'login'; updateUI(); };
    if (btnForgot) btnForgot.onclick = () => { mode = 'forgot'; updateUI(); };
    if (btnBackLogin) btnBackLogin.onclick = () => { mode = 'login'; updateUI(); };

    const closeModal = () => { 
        if(modal && content) {
            modal.classList.add('opacity-0', 'pointer-events-none');
            content.classList.remove('scale-100');
            content.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                mode = 'login'; updateUI(); form.reset();
            }, 300);
        }
    };

    if (btnClose) btnClose.onclick = closeModal;
    if (modal) modal.onclick = (e) => { if(e.target === modal) closeModal(); };

    if (btnGoogle) btnGoogle.onclick = async () => {
        try { 
            await loginWithGoogle(); 
            closeModal();
            window.showToast('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ', 'success');
        } catch(e) { window.showToast(getAuthErrorMessage(e.code), 'error'); }
    };

    if (form) form.onsubmit = async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        const name = nameInput.value;
        
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-2"></i> กำลังดำเนินการ...';
        submitBtn.disabled = true;

        try {
            if (mode === 'register') {
                await registerWithEmail(email, password, name);
                window.showToast('สมัครสมาชิกสำเร็จ!', 'success');
                closeModal();
            } else if (mode === 'login') {
                await loginWithEmail(email, password);
                window.showToast('เข้าสู่ระบบสำเร็จ', 'success');
                closeModal();
            } else if (mode === 'forgot') {
                await resetPasswordEmail(email);
                window.showToast('ส่งลิงก์รีเซ็ตแล้ว', 'info');
                setTimeout(() => { mode = 'login'; updateUI(); }, 2000);
            }
        } catch(e) { window.showToast(getAuthErrorMessage(e.code), 'error'); } 
        finally { submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false; }
    };
}

function setupAuthEvents() {
    const loginBtns = [document.getElementById('btn-login-google'), document.getElementById('btn-login-google-mobile')];
    const logoutBtns = [document.getElementById('btn-logout'), document.getElementById('btn-logout-mobile')];
    
    loginBtns.forEach(btn => { if(btn) btn.onclick = window.triggerLogin; });

    logoutBtns.forEach(btn => {
        if(btn) btn.onclick = async () => {
            if(confirm('ต้องการออกจากระบบ?')) {
                // Clear cache on logout
                localStorage.removeItem('ani_user_cache');
                await logoutUser();
            }
        };
    });

    // Real Firebase Auth Listener (Source of Truth)
    monitorUserAuth((user) => {
        if (user) {
            const name = user.displayName || user.email.split('@')[0];
            const photo = user.photoURL || `https://ui-avatars.com/api/?name=${name}&background=random`;
            
            // 1. Save to Cache
            const userData = { name, photo };
            localStorage.setItem('ani_user_cache', JSON.stringify(userData));

            // 2. Update UI
            setUIStateLoggedIn(userData);
            checkNotifications(user.uid);
            
        } else {
            // 1. Clear Cache
            localStorage.removeItem('ani_user_cache');
            
            // 2. Update UI
            setUIStateLoggedOut();
        }
    });
}

function setupNavbarEvents() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    const mSearchBtn = document.getElementById('mobile-search-button');
    const mSearchBar = document.getElementById('mobile-search-bar');
    const closeSearchBtn = document.getElementById('mobile-close-search');

    const toggle = (el) => el?.classList.toggle('hidden');
    const hide = (el) => el?.classList.add('hidden');
    const show = (el) => el?.classList.remove('hidden');
    const isVisible = (el) => !el?.classList.contains('hidden');

    if (menuBtn && menu) menuBtn.onclick = (e) => { 
        e.stopPropagation(); toggle(menu); 
        if(isVisible(menu)) hide(mSearchBar); 
    };

    if (mSearchBtn && mSearchBar) mSearchBtn.onclick = (e) => { 
        e.preventDefault(); e.stopPropagation(); show(mSearchBar); hide(menu); 
        setTimeout(() => document.getElementById('mobile-search-input')?.focus(), 100); 
    };

    if (closeSearchBtn) closeSearchBtn.onclick = (e) => { e.stopPropagation(); hide(mSearchBar); };

    document.addEventListener('click', (e) => {
        if (menu && isVisible(menu) && !menu.contains(e.target) && !menuBtn.contains(e.target)) hide(menu);
        if (mSearchBar && isVisible(mSearchBar) && !mSearchBar.contains(e.target) && !mSearchBtn.contains(e.target)) hide(mSearchBar);
    });

    const handleRandom = async () => {
        try {
             const q = query(collection(db, `artifacts/${appId}/public/data/shows`), limit(20));
             const snap = await getDocs(q);
             if(!snap.empty) {
                const rIdx = Math.floor(Math.random() * snap.docs.length);
                window.location.href = `player.html?id=${snap.docs[rIdx].id}`;
             } else { window.showToast("ไม่มีข้อมูล", "error"); }
        } catch(e) { console.error(e); }
    };

    const btnRandD = document.getElementById('btn-random-anime');
    const btnRandM = document.getElementById('btn-random-anime-mobile');
    if(btnRandD) btnRandD.onclick = handleRandom;
    if(btnRandM) btnRandM.onclick = handleRandom;
}

function highlightActiveLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const currentParams = new URLSearchParams(window.location.search);

    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const [linkPathRaw, linkQueryRaw] = href.split('?');
        const linkPath = linkPathRaw || 'index.html';
        
        if (linkPath !== currentPath) {
            if (!((currentPath === 'index.html' || currentPath === '') && (linkPath === 'index.html' || linkPath === ''))) {
                link.classList.remove('bg-gray-800', 'text-white', 'border-green-500', 'shadow-inner');
                link.classList.add('text-gray-300');
                return;
            }
        }

        let isMatch = true;
        if (linkQueryRaw) {
            const linkParams = new URLSearchParams(linkQueryRaw);
            for (const [key, value] of linkParams.entries()) {
                if (currentParams.get(key) !== decodeURIComponent(value)) { isMatch = false; break; }
            }
        } else if (currentParams.has('tag') || currentParams.has('search')) {
             if (linkPath === 'index.html' || linkPath === 'grid.html') isMatch = false;
        }

        if (isMatch) {
            link.classList.remove('text-gray-300', 'hover:text-white');
            link.classList.add('bg-gray-800', 'text-white', 'border-green-500', 'shadow-inner');
            if(link.classList.contains('border-l-4')) {
                link.classList.remove('border-transparent');
                link.classList.add('border-green-500');
            }
        }
    });
}
