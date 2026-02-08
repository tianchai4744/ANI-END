import { 
    loginWithGoogle, loginWithEmail, registerWithEmail, resetPasswordEmail,
    logoutUser, monitorUserAuth, getAuthErrorMessage 
} from "../services/auth.js";

// Import Modules
import { initRandomButton } from "./random-service.js";
import { initNotificationSystem } from "./notification-service.js";

// --- Global Toast ---
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
    toast.innerHTML = `<i class="${iconClass}"></i><div class="text-sm font-medium">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('toast-enter'); toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 4000);
};

window.triggerLogin = () => {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');
    if(modal && content) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0', 'pointer-events-none');
            content.classList.remove('scale-95'); content.classList.add('scale-100');
        });
    }
};

// [KEY FIX] เปลี่ยนชื่อ Cache Key เพื่อบังคับให้เครื่องผู้ใช้โหลดใหม่ทันที
const NAVBAR_CACHE_KEY = 'ani_navbar_html_v2_fixed_slashes'; 

function setUIStateLoggedIn(userData) {
    if (!userData) return;

    const { name, photo } = userData;
    document.getElementById('btn-login-google')?.classList.add('hidden');
    const profile = document.getElementById('user-profile');
    if (profile) {
        profile.classList.remove('hidden');
        const avatar = document.getElementById('user-avatar');
        if(avatar) avatar.src = photo;
        
        const nameEl = document.getElementById('user-name');
        if(nameEl) nameEl.textContent = name;
        
        const dropdownName = document.getElementById('user-name-dropdown');
        if(dropdownName) dropdownName.textContent = name;
    }
    
    document.getElementById('btn-login-google-mobile')?.classList.add('hidden');
    const mProfile = document.getElementById('mobile-user-profile');
    if (mProfile) {
        mProfile.classList.remove('hidden');
        const mAvatar = document.getElementById('mobile-user-avatar');
        if(mAvatar) mAvatar.src = photo;
        
        const mName = document.getElementById('mobile-user-name');
        if(mName) mName.textContent = name;
    }
}

function setUIStateLoggedOut() {
    document.getElementById('btn-login-google')?.classList.remove('hidden');
    document.getElementById('user-profile')?.classList.add('hidden');
    document.getElementById('btn-login-google-mobile')?.classList.remove('hidden');
    document.getElementById('mobile-user-profile')?.classList.add('hidden');
}

async function renderNavbarHTML(placeholder, rawHtml, pathPrefix) {
    // [KEY FIX] ระบบจัดการ Path อัจฉริยะ (แก้ปัญหา //////)
    let html = rawHtml.replace(/href="([^"]*)"/g, (match, href) => {
        if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return match;
        
        // ลบเครื่องหมาย / ด้านหน้าลิงก์ออก (เช่น "/index.html" -> "index.html")
        const cleanHref = href.startsWith('/') ? href.substring(1) : href;
        
        // ลบเครื่องหมาย / ด้านหลัง Prefix ออก (เช่น "../" -> "..")
        const cleanPrefix = pathPrefix.endsWith('/') ? pathPrefix.slice(0, -1) : pathPrefix;
        
        // เชื่อมกันด้วย / ตัวเดียวเสมอ
        return `href="${cleanPrefix}/${cleanHref}"`;
    });

    // ทำแบบเดียวกันกับ src (รูปภาพ)
    html = html.replace(/src="([^"]*)"/g, (match, src) => {
         if (src.startsWith('http') || src.startsWith('data:')) return match;
         
         const cleanSrc = src.startsWith('/') ? src.substring(1) : src;
         const cleanPrefix = pathPrefix.endsWith('/') ? pathPrefix.slice(0, -1) : pathPrefix;
         
         return `src="${cleanPrefix}/${cleanSrc}"`;
    });

    placeholder.innerHTML = html;
    
    // ตั้งค่า User
    const cachedUser = localStorage.getItem('ani_user_cache');
    if (cachedUser) {
        try { 
            const userData = JSON.parse(cachedUser);
            if(userData && userData.name) {
                setUIStateLoggedIn(userData); 
            } else {
                localStorage.removeItem('ani_user_cache');
                setUIStateLoggedOut();
            }
        } 
        catch(e) { localStorage.removeItem('ani_user_cache'); setUIStateLoggedOut(); }
    } else {
        setUIStateLoggedOut();
    }

    // เริ่มระบบ
    setupNavbarEvents();
    setupAuthEvents();     
    setupAuthModalLogic();
    highlightActiveLink(); 
}

export async function loadNavbar(pathPrefix = '.') {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    // Load from Cache (Instant)
    const cachedHtml = localStorage.getItem(NAVBAR_CACHE_KEY);
    let isRenderedFromCache = false;

    if (cachedHtml) {
        await renderNavbarHTML(placeholder, cachedHtml, pathPrefix);
        isRenderedFromCache = true;
    }

    // Load from Network (Background Update)
    try {
        const response = await fetch(`${pathPrefix}/components/navbar.html`);
        if (!response.ok) throw new Error(`Failed to load navbar`);
        
        const rawHtml = await response.text();
        localStorage.setItem(NAVBAR_CACHE_KEY, rawHtml);

        if (!isRenderedFromCache) {
            await renderNavbarHTML(placeholder, rawHtml, pathPrefix);
        } else {
            console.log('Navbar loaded from cache. Updated version saved.');
        }

    } catch (error) {
        console.error("Navbar load error:", error);
    }
}

// ... (ส่วน Logic Modal และ Event เดิมด้านล่างคงไว้เหมือนเดิม ไม่ต้องเปลี่ยนแปลง) ...
function setupAuthModalLogic() {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');
    const btnClose = document.getElementById('btn-close-auth');
    const btnGoogle = document.getElementById('btn-auth-google');
    const form = document.getElementById('email-auth-form');
    
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
        if(!nameInput || !passwordInput) return;
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
            content.classList.remove('scale-100'); content.classList.add('scale-95');
            setTimeout(() => { modal.classList.add('hidden'); mode = 'login'; updateUI(); if(form) form.reset(); }, 300);
        }
    };

    if (btnClose) btnClose.onclick = closeModal;
    if (modal) modal.onclick = (e) => { if(e.target === modal) closeModal(); };

    if (btnGoogle) btnGoogle.onclick = async () => {
        try { await loginWithGoogle(); closeModal(); window.showToast('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ', 'success'); } 
        catch(e) { window.showToast(getAuthErrorMessage(e.code), 'error'); }
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
                localStorage.removeItem('ani_user_cache');
                await logoutUser();
            }
        };
    });

    monitorUserAuth((user) => {
        if (user) {
            const displayName = user.displayName;
            const emailName = user.email ? user.email.split('@')[0] : 'Guest';
            const name = displayName || emailName;

            const photo = user.photoURL || `https://ui-avatars.com/api/?name=${name}&background=random`;
            const userData = { name, photo };
            localStorage.setItem('ani_user_cache', JSON.stringify(userData));
            setUIStateLoggedIn(userData);
            initNotificationSystem(user.uid); 
        } else {
            localStorage.removeItem('ani_user_cache');
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

    initRandomButton();
}

function highlightActiveLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const currentParams = new URLSearchParams(window.location.search);

    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const cleanHref = href.replace(/^(\.\.\/|\.\/)/, '').split('?')[0];
        
        if (cleanHref !== currentPath && !(cleanHref === 'index.html' && currentPath === '')) {
             link.classList.remove('bg-gray-800', 'text-white', 'border-green-500', 'shadow-inner');
             link.classList.add('text-gray-300');
             return;
        }
        
        let isMatch = true;
        if (href.includes('?')) {
            const linkQueryRaw = href.split('?')[1];
            const linkParams = new URLSearchParams(linkQueryRaw);
            for (const [key, value] of linkParams.entries()) {
                if (currentParams.get(key) !== decodeURIComponent(value)) { isMatch = false; break; }
            }
        }
        if (isMatch) {
            link.classList.remove('text-gray-300', 'hover:text-white');
            link.classList.add('bg-gray-800', 'text-white', 'border-green-500', 'shadow-inner');
        }
    });
}
