// js/renderers/player-renderer.js
// 🎨 PLAYER RENDERER: ส่วนแสดงผล (Dumb Component)

export const PlayerRenderer = {
    // 1. จัดการ Loading Screen (แก้คืน Spinner ให้แล้วครับ)
    toggleLoading(isLoading, message = "กำลังโหลดข้อมูล...") {
        const loader = document.getElementById('loading-player');
        const content = document.getElementById('player-content-wrapper');
        
        if (isLoading) {
            if (loader) {
                loader.classList.remove('hidden');
                // สร้าง Spinner ถ้ายังไม่มี (ป้องกันหาย)
                if (!loader.querySelector('.spinner')) {
                    loader.innerHTML = `
                        <div class="spinner"></div>
                        <p class="mt-4 text-gray-400 animate-pulse">${message}</p>
                    `;
                } else {
                    const p = loader.querySelector('p');
                    if (p) p.textContent = message;
                }
            }
            if (content) content.classList.add('hidden');
        } else {
            if (loader) loader.classList.add('hidden');
            if (content) content.classList.remove('hidden');
        }
    },

    // 2. แสดงข้อมูล Show Info (แค่ใส่ข้อความ ไม่คำนวณ)
    renderShowInfo(show) {
        if (!show) return;
        this._setText('show-title', show.title);
        
        const descEl = document.getElementById('show-description');
        if (descEl) {
            descEl.textContent = show.description || "-";
            descEl.classList.add('line-clamp-2'); // บังคับย่อไว้ก่อนเสมอ
        }
    },

    // ✅ ฟังก์ชันใหม่: เรียกใช้เมื่อหน้าเว็บโชว์แล้วเท่านั้น
    checkDescriptionOverflow() {
        const descEl = document.getElementById('show-description');
        const expandBtn = document.getElementById('expand-desc-btn');

        if (!descEl || !expandBtn) return;

        // Reset state
        expandBtn.classList.add('hidden');
        descEl.classList.add('line-clamp-2');

        // ใช้ setTimeout เล็กน้อยเพื่อให้ Browser วาดขนาดกล่องให้เสร็จก่อนคำนวณ
        setTimeout(() => {
            // เช็คว่าข้อความยาวเกินกล่องหรือไม่
            if (descEl.scrollHeight > descEl.clientHeight) {
                expandBtn.classList.remove('hidden');
                expandBtn.textContent = 'เพิ่มเติม';
                
                expandBtn.onclick = () => {
                    const isClamped = descEl.classList.toggle('line-clamp-2');
                    expandBtn.textContent = isClamped ? 'เพิ่มเติม' : 'ย่อ';
                };
            }
        }, 100);
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

    // 4. แสดง Error
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
        this._setText('show-title', meta.episodeTitle);

        const setMeta = (prop, content) => {
            let el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
            if (el) el.setAttribute('content', content);
        };

        setMeta('og:title', meta.title);
        setMeta('og:description', meta.description);
        setMeta('og:image', meta.image);
    },

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
