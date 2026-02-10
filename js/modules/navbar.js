// js/modules/navbar.js
import { 
    loginWithGoogle, loginWithEmail, registerWithEmail, resetPasswordEmail,
    logoutUser, monitorUserAuth, getAuthErrorMessage 
} from "../services/auth.js";
import { initRandomButton } from "./random-service.js";
import { initNotificationSystem } from "./notification-service.js";
import { initGlobalErrorLogging } from "./logger.js";

// --- 🧠 SERVICE LAYER ---
const NavbarService = {
    CACHE_KEY: 'ani_navbar_v5_pro_full', 

    getCache() { return localStorage.getItem(this.CACHE_KEY); },
    setCache(html) { localStorage.setItem(this.CACHE_KEY, html); },
    clearCache() { localStorage.removeItem(this.CACHE_KEY); },

    getUserCache() {
        try { return JSON.parse(localStorage.getItem('ani_user_cache')); } catch { return null; }
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

// --- 🎨 UI LAYER ---
const NavbarUI = {
    placeholder: null,

    init() { this.placeholder = document.getElementById('navbar-placeholder'); },
    renderHTML(html) { if (this.placeholder) this.placeholder.innerHTML = html; },

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
        const toggle = (id, show) => { const el = document.getElementById(id); if(el) show ? el.classList.remove('hidden') : el.classList.add('hidden'); };
        const setSrc = (id, src) => { const el = document.getElementById(id); if(el) el.src = src; };
        const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };

        if (user) {
            // Desktop
            toggle('btn-login-google', false);
            toggle('user-profile', true);
            setSrc('user-avatar', user.photo);
            setText('user-name-dropdown', user.name);
            // Mobile
            toggle('btn-login-google-mobile', false);
            toggle('mobile-user-profile', true);
            toggle('btn-logout-mobile', true);
            setSrc('mobile-user-avatar', user.photo);
            setText('mobile-user-name', user.name);
        } else {
            // Desktop
            toggle('btn-login-google', true);
            toggle('user-profile', false);
            // Mobile
            toggle('btn-login-google-mobile', true);
            toggle('mobile-user-profile', false);
            toggle('btn-logout-mobile', false);
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

        const isLinkActive = (href) => {
            if (!href) return false;
            const linkPath = href.split('?')[0].split('/').pop() || 'index.html';
            if (linkPath !== currentPath) return false;
            if (href.includes('?')) {
                const linkParams = new URLSearchParams(href.split('?')[1]);
                for (const [key, value] of linkParams.entries()) {
                    if (currentParams.get(key) !== decodeURIComponent(value)) return false;
                }
            }
            return true;
        };

        // Desktop
        document.querySelectorAll('.nav-link').forEach(link => {
            if (isLinkActive(link.getAttribute('href'))) {
                link.classList.add('nav-active');
                link.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
            } else {
                link.classList.remove('nav-active');
                link.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-white/5');
            }
        });

        // Mobile
        document.querySelectorAll('.nav-link-mobile').forEach(link => {
            const iconBox = link.querySelector('span:first-child'); 
            if (isLinkActive(link.getAttribute('href'))) {
                link.classList.add('bg-green-500/10', 'text-green-400', 'border-l-4', 'border-green-500');
                link.classList.remove('text-gray-300', 'hover:bg-gray-800');
                if(iconBox) iconBox.classList.add('bg-green-500/20', 'text-green-400');
            } else {
                link.classList.remove('bg-green-500/10', 'text-green-400', 'border-l-4', 'border-green-500');
                link.classList.add('text-gray-300', 'hover:bg-gray-800');
                if(iconBox) iconBox.classList.remove('bg-green-500/20', 'text-green-400');
            }
        });
    }
};

// --- 🎮 CONTROLLER ---
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
        initPostRender(); 
    }

    try {
        const rawHtml = await NavbarService.fetchHTML(pathPrefix);
        NavbarService.setCache(rawHtml);
        if (!isRenderedFromCache) {
            NavbarUI.renderHTML(NavbarService.fixPaths(rawHtml, pathPrefix));
            initPostRender();
        }
    } catch (error) { console.error("Navbar load error:", error); }
}

function initPostRender() {
    const cachedUser = NavbarService.getUserCache();
    NavbarUI.updateAuthState(cachedUser);
    NavbarUI.highlightActiveLink();
    
    setupInteractions();
    setupAuthSystem();
    initRandomButton(); 
}

function setupInteractions() {
    const els = {
        menuBtn: document.getElementById('mobile-menu-btn'),
        closeBtn: document.getElementById('mobile-close-btn'),
        menu: document.getElementById('mobile-menu'),
        backdrop: document.getElementById('mobile-menu-backdrop'),
        mSearch: document.getElementById('mobile-search-input')
    };

    const toggleMenu = (show) => {
        if(!els.menu || !els.backdrop) return;
        if (show) {
            els.menu.classList.remove('drawer-closed');
            els.menu.classList.add('drawer-open');
            els.backdrop.classList.add('backdrop-visible');
            document.body.style.overflow = 'hidden'; 
        } else {
            els.menu.classList.add('drawer-closed');
            els.menu.classList.remove('drawer-open');
            els.backdrop.classList.remove('backdrop-visible');
            document.body.style.overflow = '';
        }
    };

    if (els.menuBtn) els.menuBtn.onclick = (e) => { e.stopPropagation(); toggleMenu(true); };
    if (els.closeBtn) els.closeBtn.onclick = () => toggleMenu(false);
    if (els.backdrop) els.backdrop.onclick = () => toggleMenu(false);
    if (els.mSearch) els.mSearch.onclick = (e) => e.stopPropagation(); 
}

function setupAuthSystem() {
    const bind = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    
    bind('btn-login-google', window.triggerLogin);
    bind('btn-login-google-mobile', window.triggerLogin);
    
    const logout = async () => {
        if(confirm('ต้องการออกจากระบบ?')) {
            NavbarService.setUserCache(null);
            await logoutUser();
            window.location.reload();
        }
    };
    bind('btn-logout', logout);
    bind('btn-logout-mobile', logout);

    initAuthModalLogic();
    
    monitorUserAuth((user) => {
        const userData = NavbarService.setUserCache(user);
        NavbarUI.updateAuthState(userData);
        if(user) initNotificationSystem(user.uid);
    });
}

// 🔥 Logic ที่หายไป: ใส่กลับมาให้ครบแล้วครับ
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

    // Events
    if (els.switchBtn) els.switchBtn.onclick = (e) => { e.preventDefault(); mode = (mode === 'login') ? 'register' : 'login'; updateModalUI(); };
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
