// ในไฟล์ js/modules/navbar.js

function setupNavbarInteractions() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('mobile-close-btn');
    const menu = document.getElementById('mobile-menu');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    
    // Mobile Search (Sidebar version)
    const mSearchInput = document.getElementById('mobile-search-input');
    
    const toggleMenu = (show) => {
        if (show) {
            menu.classList.add('drawer-open'); // class นี้อยู่ใน <style> ใน html ใหม่
            menu.classList.remove('translate-x-full'); // Tailwind fallback
            backdrop.classList.add('backdrop-active');
            backdrop.classList.remove('pointer-events-none', 'opacity-0');
            document.body.style.overflow = 'hidden'; // ป้องกันการเลื่อนจอหลัง
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

    // active link logic เดิม (ปรับปรุง class ให้เข้ากับดีไซน์ใหม่)
    const highlightActiveLink = () => {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const currentParams = new URLSearchParams(window.location.search);
        
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if(!href) return;
            
            // Logic การเช็ค URL เดิม
            let isMatch = false;
            const cleanHref = href.replace(/^(\.\.\/|\.\/)/, '').split('?')[0];
            
            if (cleanHref === currentPath) {
                 isMatch = true;
                 if (href.includes('?')) {
                    const linkParams = new URLSearchParams(href.split('?')[1]);
                    for (const [key, value] of linkParams.entries()) {
                        if (currentParams.get(key) !== decodeURIComponent(value)) isMatch = false;
                    }
                 }
            }

            // Apply New Styles
            if (isMatch) {
                // Style: White Text + Green Glow Background
                link.classList.remove('text-gray-400', 'hover:bg-white/10');
                link.classList.add('bg-green-500/10', 'text-green-400', 'shadow-[0_0_15px_rgba(74,222,128,0.2)]');
            } else {
                link.classList.remove('bg-green-500/10', 'text-green-400', 'shadow-[0_0_15px_rgba(74,222,128,0.2)]');
                link.classList.add('text-gray-400', 'hover:bg-white/10');
            }
        });
    };
    
    // เรียกใช้ highlight ทันที
    highlightActiveLink();
    
    // Search Mobile Logic (ถ้ามีการพิมพ์)
    if(mSearchInput) {
        // ... (ใส่ logic search เชื่อมกับ module search ถ้าจำเป็น)
    }
}
