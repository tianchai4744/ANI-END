// js/renderers/player-renderer.js
// 🎨 PLAYER RENDERER: ส่วนแสดงผล (Dumb Component)
// หน้าที่: รับข้อมูลดิบ -> แปลงเป็น HTML -> แปะลงหน้าเว็บ

export const PlayerRenderer = {
    // 1. จัดการ Loading Screen
    toggleLoading(isLoading, message = "กำลังโหลดข้อมูล...") {
        const loader = document.getElementById('loading-player');
        const content = document.getElementById('player-content-wrapper');
        
        if (isLoading) {
            if (loader) {
                loader.classList.remove('hidden');
                // Simple Text Update
                const p = loader.querySelector('p');
                if (p) p.textContent = message;
            }
            if (content) content.classList.add('hidden');
        } else {
            if (loader) loader.classList.add('hidden');
            if (content) content.classList.remove('hidden');
        }
    },

    // 2. แสดงข้อมูล Show Info
    renderShowInfo(show) {
        if (!show) return;
        
        this._setText('show-title', show.title);
        
        const descEl = document.getElementById('show-description');
        const expandBtn = document.getElementById('expand-desc-btn');

        if (descEl) {
            descEl.textContent = show.description || "-";
            descEl.classList.add('line-clamp-2'); // Reset state
            
            // Check overflow logic (Pure DOM check)
            setTimeout(() => {
                if (descEl.scrollHeight > descEl.clientHeight) {
                    if (expandBtn) {
                        expandBtn.classList.remove('hidden');
                        expandBtn.textContent = 'เพิ่มเติม';
                        // Simple Toggle Logic injection
                        expandBtn.onclick = () => {
                            descEl.classList.toggle('line-clamp-2');
                            expandBtn.textContent = descEl.classList.contains('line-clamp-2') ? 'เพิ่มเติม' : 'ย่อ';
                        };
                    }
                } else {
                    if (expandBtn) expandBtn.classList.add('hidden');
                }
            }, 50);
        }
    },

    // 3. แสดง Video Player
    renderPlayer(embedHtml) {
        const container = document.getElementById('video-player-embed');
        if (!container) return;

        if (embedHtml) {
            container.innerHTML = embedHtml;
        } else {
            this.renderErrorState("ไม่พบลิงก์วิดีโอ หรือไฟล์ถูกลบ");
        }
    },

    // 4. แสดง Error หรือ State ว่างเปล่าในกล่องวิดีโอ
    renderErrorState(message) {
        const container = document.getElementById('video-player-embed');
        if (container) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-900">
                    <i class="ri-error-warning-line text-4xl mb-2"></i>
                    <p>${message}</p>
                </div>`;
        }
    },

    // 5. Update SEO Meta Tags
    updateMetaData(meta) {
        document.title = meta.title;
        
        // Update Header Title if exists
        this._setText('show-title', meta.episodeTitle);

        const setMeta = (prop, content) => {
            let el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
            if (el) el.setAttribute('content', content);
        };

        setMeta('og:title', meta.title);
        setMeta('og:description', meta.description);
        setMeta('og:image', meta.image);
    }
    ,

    // 6. ปุ่ม Navigation
    updateNavButtons({ canGoPrev, canGoNext }) {
        this._setBtnState('prev-episode-btn', canGoPrev);
        this._setBtnState('next-episode-btn', canGoNext);
    },

    // --- Internal Helpers ---
    _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    _setBtnState(id, isEnabled) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = !isEnabled;
            btn.classList.toggle('opacity-50', !isEnabled);
            btn.classList.toggle('cursor-not-allowed', !isEnabled);
            btn.classList.toggle('hover:bg-gray-700', !isEnabled);
        }
    }
};
