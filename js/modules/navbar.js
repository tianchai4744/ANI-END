// js/modules/navbar.js
import { 
    loginWithGoogle, loginWithEmail, registerWithEmail, resetPasswordEmail,
    logoutUser, monitorUserAuth, getAuthErrorMessage 
} from "../services/auth.js";

import { initRandomButton } from "./random-service.js";
import { initNotificationSystem } from "./notification-service.js"; // อย่าลืมบรรทัดนี้!
import { initGlobalErrorLogging } from "./logger.js";

// --- 🧠 SERVICE LAYER (Logic: ข้อมูล, Cache, Path) ---
const NavbarService = {
    CACHE_KEY: 'ani_navbar_html_v4_pro', // เปลี่ยน key เพื่อให้เครื่อง user โหลดใหม่

    getCache() {
        return localStorage.getItem(this.CACHE_KEY);
    },

    setCache(html) {
        localStorage.setItem(this.CACHE_KEY, html);
    },

    clearCache() {
        localStorage.removeItem(this.CACHE_KEY);
    },

    getUserCache() {
        try {
            return JSON.parse(localStorage.getItem('ani_user_cache'));
        } catch { return null; }
    },

    setUserCache(user) {
        if (user) {
            const userData = {
                name: user.displayName || user.email.split('@')[0],
                photo: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`
            };
            localStorage.setItem('ani_user_cache', JSON.stringify(userData));
            return userData;
        } else {
            localStorage.removeItem('ani_user_cache');
            return null;
        }
    },

    fixPaths(html, pathPrefix) {
        let processed = html.replace(/href="([^"]*)"/g, (match, href) => {
            if (href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return match;
            const cleanHref = href.startsWith('/') ? href.substring(1) : href;
            const cleanPrefix = pathPrefix.endsWith('/') ? pathPrefix.slice(0, -1) : pathPrefix;
            return `href="${cleanPrefix}/${cleanHref}"`;
        });

        processed = processed.replace(/src="([^"]*)"/g, (match, src) => {
             if (src.startsWith('http') || src.startsWith('data:')) return match;
             const cleanSrc = src.startsWith('/') ? src.substring(1) : src;
             const cleanPrefix = pathPrefix.endsWith('/') ? pathPrefix.slice(0, -1) : pathPrefix;
             return `src="${cleanPrefix}/${cleanSrc}"`;
        });

        return processed;
    },

    async fetchHTML(pathPrefix) {
        const response = await fetch(`${pathPrefix}/components/navbar.html`);
        if (!response.ok) throw new Error("Failed to load navbar");
        return await response.text();
    }
};

// --- 🎨 UI LAYER (View: DOM, Modal, Toast) ---
const NavbarUI = {
    placeholder: null,

    init() {
        this.placeholder = document.getElementById('navbar-placeholder');
    },

    renderHTML(html) {
        if (this.placeholder) this.placeholder.innerHTML = html;
    },

    showToast(message, type = 'success') {
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
        setTimeout(() => { 
            toast.classList.remove('toast-enter'); toast.classList.add('toast-exit'); 
            setTimeout(() => toast.remove(), 300); 
        }, 4000);
    },

    updateAuthState(user) {
        const els = {
            desktop: {
                loginBtn: document.getElementById('btn-login-google'),
                profile: document.getElementById('user-profile'),
                avatar: document.getElementById('user-avatar'),
                name: document.getElementById('user-name'),
                dropdownName: document.getElementById('user-name-dropdown')
            },
            mobile: {
                loginBtn: document.getElementById('btn-login-google-mobile'),
                profile: document.getElementById('mobile-user-profile'),
                avatar: document.getElementById('mobile-user-avatar'),
                name: document.getElementById('mobile-user-name')
            }
        };

        if (user) {
            // Logged In
            els.desktop.loginBtn?.classList.add('hidden');
            els.desktop.profile?.classList.remove('hidden');
            if(els.desktop.avatar) els.desktop.avatar.src = user.photo;
            if(els.desktop.name) els.desktop.name.textContent = user.name;
            if(els.desktop.dropdownName) els.desktop.dropdownName.textContent = user.name;

            els.mobile.loginBtn?.classList.add('hidden');
            els.mobile.profile?.classList.remove('hidden');
            if(els.mobile.avatar) els.mobile.avatar.src = user.photo;
            if(els.mobile.name) els.mobile.name.textContent = user.name;
        } else {
            // Logged Out
            els.desktop.loginBtn?.classList.remove('hidden');
            els.desktop.profile?.classList.add('hidden');
            els.mobile.loginBtn?.classList.remove('hidden');
            els.mobile.profile?.classList.add('hidden');
        }
    },

    toggleAuthModal(show) {
        const modal = document.getElementById('auth-modal');
        const content = document.getElementById('auth-modal-content');
        if(!modal || !content) return;

        if(show) {
            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0', 'pointer-events-none');
                content.classList.remove('scale-95'); content.classList.add('scale-100');
            });
        } else {
            modal.classList.add('opacity-0', 'pointer-events-none');
            content.classList.remove('scale-100'); content.classList.add('scale-95');
            setTimeout(() => { modal.classList.add('hidden'); }, 300);
        }
    },

    highlightActiveLink() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const currentParams = new URLSearchParams(window.location.search);

        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const cleanHref = href.replace(/^(\.\.\/|\.\/)/, '').split('?')[0];
            
            // Logic เช็คหน้าปัจจุบัน
            let isMatch = false;
            if (cleanHref === currentPath) {
                 isMatch = true;
                 if (href.includes('?')) {
                    const linkParams = new URLSearchParams(href.split('?')[1]);
                    for (const [key, value] of linkParams.entries()) {
                        if (currentParams.get(key) !== decodeURIComponent(value)) { isMatch = false; break; }
                    }
                 }
            }
            
            // New Style Application
            if (isMatch) {
                link.classList.remove('text-gray-400', 'hover:bg-white/10');
                link.classList.add('bg-green-500/10', 'text-green-400', 'shadow-[0_0_15px_rgba(74,222,128,0.2)]');
            } else {
                link.classList.remove('bg-green-500/10', 'text-green-400', 'shadow-[0_0_15px_rgba(74,222,128,0.2)]');
                link.classList.add('text-gray-400', 'hover:bg-white/10');
            }
        });
    }
};

// --- 🎮 CONTROLLER (Main Entry) ---
export async function loadNavbar(pathPrefix = '.') {
    initGlobalErrorLogging(); 
    
    NavbarUI.init();
    if (!NavbarUI.placeholder) return;

    window.showToast = NavbarUI.showToast;
    window.triggerLogin = () => NavbarUI.toggleAuthModal(true);

    const cachedHtml = NavbarService.getCache();
    let isRenderedFromCache = false;

    if (cachedHtml) {
        NavbarUI.renderHTML(NavbarService.fixPaths(cachedHtml, pathPrefix));
        isRenderedFromCache = true;
        initPostRender(true); 
    }

    try {
        const rawHtml = await NavbarService.fetchHTML(pathPrefix);
        NavbarService.setCache(rawHtml); // Update Cache

        if (!isRenderedFromCache) {
            NavbarUI.renderHTML(NavbarService.fixPaths(rawHtml, pathPrefix));
            initPostRender(false);
        } else {
            console.log('Navbar updated from cache');
        }
    } catch (error) {
        console.error("Navbar load error:", error);
    }
}

function initPostRender(isCached) {
    const cachedUser = NavbarService.getUserCache();
    NavbarUI.updateAuthState(cachedUser);
    NavbarUI.highlightActiveLink();
    
    setupNavbarInteractions();
    setupAuthSystem();
    initRandomButton(); 
}

function setupNavbarInteractions() {
    // Mobile Sidebar Logic
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('mobile-close-btn');
    const menu = document.getElementById('mobile-menu');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    
    const toggleMenu = (show) => {
        if(!menu || !backdrop) return;
        if (show) {
            menu.classList.add('drawer-open');
            menu.classList.remove('translate-x-full');
            backdrop.classList.add('backdrop-active');
            backdrop.classList.remove('pointer-events-none', 'opacity-0');
            document.body.style.overflow = 'hidden'; 
        } else {
            menu.classList.remove('drawer-open');
            menu.classList.add('translate-x-full');
            backdrop.classList.remove('backdrop-active');
            backdrop.classList.add('pointer-events-none', 'opacity-0');
            document.body.style.overflow = '';
        }
    };

    if (menuBtn) menuBtn.onclick = (e) => { e.stopPropagation(); toggleMenu(true); };
    if (closeBtn) closeBtn.onclick = () => toggleMenu(false);
    if (backdrop) backdrop.onclick = () => toggleMenu(false);

    // Mobile Search Input Logic (เพื่อให้มัน Focus ได้และไม่ปิดเมนู)
    const mSearchInput = document.getElementById('mobile-search-input');
    if(mSearchInput) {
        mSearchInput.onclick = (e) => e.stopPropagation();
    }
}

function setupAuthSystem() {
    const setupBtn = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    
    setupBtn('btn-login-google', window.triggerLogin);
    setupBtn('btn-login-google-mobile', window.triggerLogin);
    
    const logoutHandler = async () => {
        if(confirm('ต้องการออกจากระบบ?')) {
            NavbarService.setUserCache(null);
            await logoutUser();
            window.location.reload();
        }
    };
    setupBtn('btn-logout', logoutHandler);
    setupBtn('btn-logout-mobile', logoutHandler);

    initAuthModalLogic();

    monitorUserAuth((user) => {
        const userData = NavbarService.setUserCache(user);
        NavbarUI.updateAuthState(userData);
        if(user) initNotificationSystem(user.uid); // เรียก Notification ตรงนี้
    });
}

function initAuthModalLogic() {
    const els = {
        modal: document.getElementById('auth-modal'),
        close: document.getElementById('btn-close-auth'),
        google: document.getElementById('btn-auth-google'),
        form: document.getElementById('email-auth-form'),
        title: document.getElementById('auth-modal-title'),
        icon: document.getElementById('auth-icon'),
        nameField: document.getElementById('field-name-container'),
        passField: document.getElementById('field-password-container'),
        social: document.getElementById('social-auth-section'),
        footer: document.getElementById('auth-footer'),
        inputs: {
            name: document.getElementById('auth-name'),
            email: document.getElementById('auth-email'),
            pass: document.getElementById('auth-password')
        },
        submitBtn: document.getElementById('btn-submit-auth'),
        switchBtn: document.getElementById('btn-switch-mode'),
        switchText: document.getElementById('auth-switch-text'),
        forgotBtn: document.getElementById('btn-forgot-password'),
        backBtn: document.getElementById('btn-back-login')
    };

    let mode = 'login'; 

    const updateModalUI = () => {
        if(!els.inputs.name || !els.inputs.pass) return;
        els.inputs.name.required = (mode === 'register');
        els.inputs.pass.required = (mode !== 'forgot');

        if (mode === 'login') {
            els.title.textContent = "เข้าสู่ระบบ";
            els.icon.className = "ri-login-circle-line text-green-500";
            els.nameField.classList.add('hidden');
            els.passField.classList.remove('hidden');
            els.social.classList.remove('hidden');
            els.footer.classList.remove('hidden');
            els.backBtn.classList.add('hidden');
            els.submitBtn.innerHTML = 'เข้าสู่ระบบ';
            els.switchText.textContent = "ยังไม่มีบัญชี?";
            els.switchBtn.textContent = "สมัครสมาชิกฟรี";
        } else if (mode === 'register') {
            els.title.textContent = "สมัครสมาชิกใหม่";
            els.icon.className = "ri-user-add-line text-green-500";
            els.nameField.classList.remove('hidden');
            els.passField.classList.remove('hidden');
            els.social.classList.remove('hidden');
            els.footer.classList.remove('hidden');
            els.backBtn.classList.add('hidden');
            els.submitBtn.innerHTML = 'สมัครสมาชิก';
            els.switchText.textContent = "มีบัญชีอยู่แล้ว?";
            els.switchBtn.textContent = "เข้าสู่ระบบ";
        } else if (mode === 'forgot') {
            els.title.textContent = "รีเซ็ตรหัสผ่าน";
            els.icon.className = "ri-lock-unlock-line text-yellow-500";
            els.nameField.classList.add('hidden');
            els.passField.classList.add('hidden');
            els.social.classList.add('hidden'); 
            els.footer.classList.add('hidden');    
            els.backBtn.classList.remove('hidden');
            els.submitBtn.innerHTML = 'ส่งลิงก์รีเซ็ต';
        }
    };

    if (els.switchBtn) els.switchBtn.onclick = () => { mode = (mode === 'login') ? 'register' : 'login'; updateModalUI(); };
    if (els.forgotBtn) els.forgotBtn.onclick = () => { mode = 'forgot'; updateModalUI(); };
    if (els.backBtn) els.backBtn.onclick = () => { mode = 'login'; updateModalUI(); };
    
    const close = () => {
        NavbarUI.toggleAuthModal(false);
        setTimeout(() => { mode = 'login'; updateModalUI(); if(els.form) els.form.reset(); }, 300);
    };
    
    if (els.close) els.close.onclick = close;
    if (els.modal) els.modal.onclick = (e) => { if(e.target === els.modal) close(); };

    if (els.google) els.google.onclick = async () => {
        try { await loginWithGoogle(); close(); NavbarUI.showToast('เข้าสู่ระบบสำเร็จ!', 'success'); } 
        catch(e) { NavbarUI.showToast(getAuthErrorMessage(e.code), 'error'); }
    };

    if (els.form) els.form.onsubmit = async (e) => {
        e.preventDefault();
        const email = els.inputs.email.value;
        const pass = els.inputs.pass.value;
        const name = els.inputs.name.value;
        
        const originalBtnText = els.submitBtn.innerHTML;
        els.submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-2"></i> กำลังดำเนินการ...';
        els.submitBtn.disabled = true;

        try {
            if (mode === 'register') {
                await registerWithEmail(email, pass, name);
                NavbarUI.showToast('สมัครสมาชิกสำเร็จ!', 'success');
                close();
            } else if (mode === 'login') {
                await loginWithEmail(email, pass);
                NavbarUI.showToast('เข้าสู่ระบบสำเร็จ', 'success');
                close();
            } else if (mode === 'forgot') {
                await resetPasswordEmail(email);
                NavbarUI.showToast('ส่งลิงก์รีเซ็ตแล้ว', 'info');
                setTimeout(() => { mode = 'login'; updateModalUI(); }, 2000);
            }
        } catch(e) { NavbarUI.showToast(getAuthErrorMessage(e.code), 'error'); } 
        finally { els.submitBtn.innerHTML = originalBtnText; els.submitBtn.disabled = false; }
    };
}
