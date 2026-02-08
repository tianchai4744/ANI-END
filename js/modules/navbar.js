import { 
    loginWithGoogle, loginWithEmail, registerWithEmail, resetPasswordEmail,
    logoutUser, monitorUserAuth, getAuthErrorMessage 
} from "../services/auth.js";

import { collection, getDocs, limit, query } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

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

// --- Caching Logic ---
const NAVBAR_CACHE_KEY = 'ani_navbar_html_v1';

function setUIStateLoggedIn(userData) {
    const { name, photo } = userData;
    document.getElementById('btn-login-google')?.classList.add('hidden');
    const profile = document.getElementById('user-profile');
    if (profile) {
        profile.classList.remove('hidden');
        document.getElementById('user-avatar').src = photo;
        document.getElementById('user-name').textContent = name;
        if(document.getElementById('user-name-dropdown')) document.getElementById('user-name-dropdown').textContent = name;
    }
    document.getElementById('btn-login-google-mobile')?.classList.add('hidden');
    const mProfile = document.getElementById('mobile-user-profile');
    if (mProfile) {
        mProfile.classList.remove('hidden');
        document.getElementById('mobile-user-avatar').src = photo;
        document.getElementById('mobile-user-name').textContent = name;
    }
}

function setUIStateLoggedOut() {
    document.getElementById('btn-login-google')?.classList.remove('hidden');
    document.getElementById('user-profile')?.classList.add('hidden');
    document.getElementById('btn-login-google-mobile')?.classList.remove('hidden');
    document.getElementById('mobile-user-profile')?.classList.add('hidden');
}

/**
 * ฟังก์ชันช่วย Render HTML และผูก Event (แยกออกมาเพื่อเรียกใช้ซ้ำ)
 */
async function renderNavbarHTML(placeholder, rawHtml, pathPrefix) {
    // แทนที่ Path ต่างๆ ให้ถูกต้องตามตำแหน่งไฟล์
    let html = rawHtml.replace(/href="([^"]*)"/g, (match, href) => {
        if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return match;
        const cleanHref = href.startsWith('/') ? href.substring(1) : href;
        return `href="${pathPrefix}/${cleanHref}"`;
    });
    html = html.replace(/src="([^"]*)"/g, (match, src) => {
         if (src.startsWith('http') || src.startsWith('data:')) return match;
         const cleanSrc = src.startsWith('/') ? src.substring(1) : src;
         return `src="${pathPrefix}/${cleanSrc}"`;
    });

    placeholder.innerHTML = html;
    
    // ตั้งค่า User Profile
    const cachedUser = localStorage.getItem('ani_user_cache');
    if (cachedUser) {
        try { setUIStateLoggedIn(JSON.parse(cachedUser)); } 
        catch(e) { localStorage.removeItem('ani_user_cache'); setUIStateLoggedOut(); }
    } else {
        setUIStateLoggedOut();
    }

    // เริ่มการทำงานระบบต่างๆ
    setupNavbarEvents();
    setupAuthEvents();     
    setupAuthModalLogic();
    highlightActiveLink(); 
}

export async function loadNavbar(pathPrefix = '.') {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    // 1. บังคับใส่ Style พื้นฐานทันทีเพื่อจองพื้นที่ (ป้องกัน Layout Shift)
    // ตรงนี้จะทำงานคู่กับการแก้ HTML ในขั้นตอนที่ 2
    placeholder.style.minHeight = '64px';
    placeholder.classList.add('block', 'w-full', 'sticky', 'top-0', 'z-50');

    // 2. ลองโหลดจาก Cache ในเครื่องก่อน (Instant Load)
    const cachedHtml = localStorage.getItem(NAVBAR_CACHE_KEY);
    let isRenderedFromCache = false;

    if (cachedHtml) {
        await renderNavbarHTML(placeholder, cachedHtml, pathPrefix);
        isRenderedFromCache = true; // จำไว้ว่าเราโชว์ของเก่าไปแล้ว
    }

    // 3. โหลดไฟล์ล่าสุดจาก Server (Background Update)
    try {
        const response = await fetch(`${pathPrefix}/components/navbar.html`);
        if (!response.ok) throw new Error(`Failed to load navbar`);
        
        const rawHtml = await response.text();
        
        // บันทึกของใหม่ลง Cache
        localStorage.setItem(NAVBAR_CACHE_KEY, rawHtml);

        // ถ้ายังไม่ได้ Render (คือไม่มี Cache หรือมาครั้งแรก) ให้แสดงผลเลย
        if (!isRenderedFromCache) {
            await renderNavbarHTML(placeholder, rawHtml, pathPrefix);
        } else {
            // ถ้า Render จาก Cache ไปแล้ว เราจะไม่ Render ทับเพื่อไม่ให้ UI กระตุก
            // ผู้ใช้จะเห็นเวอร์ชันใหม่ในการรีโหลดหน้าครั้งถัดไป
            console.log('Navbar loaded from cache. Updated version saved for next visit.');
        }

    } catch (error) {
        console.error("Navbar load error:", error);
    }
}

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
            const name = user.displayName || user.email.split('@')[0];
            const photo = user.photoURL || `https://ui-avatars.com/api/?name=${name}&background=random`;
            const userData = { name, photo };
            localStorage.setItem('ani_user_cache', JSON.stringify(userData));
            setUIStateLoggedIn(userData);
            
            // เริ่มระบบแจ้งเตือนเมื่อ Login
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

    // เริ่มระบบปุ่มสุ่ม
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
