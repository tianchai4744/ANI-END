// js/renderers/player-renderer.js
// 🎨 PLAYER RENDERER: รับผิดชอบเรื่องหน้าตาและการแสดงผล (Logic Free)

export const PlayerRenderer = {
    // 1. จัดการหน้า Loading
    toggleLoading(isLoading, errorMessage = null) {
        const loader = document.getElementById('loading-player');
        const content = document.getElementById('player-content-wrapper');
        
        if (isLoading) {
            if (loader) {
                loader.classList.remove('hidden');
                if (errorMessage) {
                    loader.innerHTML = `<p class="text-red-500 text-center mt-4 bg-black/50 p-2 rounded">${errorMessage}</p>`;
                } else {
                    // ถ้าไม่มี Spinner เดิม ให้สร้างใหม่, ถ้ามีแล้วก็ปล่อยไว้
                    if (!loader.querySelector('.spinner')) {
                         loader.innerHTML = '<div class="spinner"></div><p class="mt-4 text-gray-400 animate-pulse">กำลังโหลดข้อมูล...</p>';
                    }
                }
            }
            if (content) content.classList.add('hidden');
        } else {
            if (loader) loader.classList.add('hidden');
            if (content) content.classList.remove('hidden');
        }
    },

    // 2. แสดงข้อมูลอนิเมะ (ชื่อ, คำอธิบาย, ปุ่มย่อ/ขยาย)
    renderShowInfo(show) {
        if (!show) return;
        
        const titleEl = document.getElementById('show-title');
        const descEl = document.getElementById('show-description');
        const expandBtn = document.getElementById('expand-desc-btn');

        if (titleEl) titleEl.textContent = show.title;
        
        if (descEl) {
            descEl.textContent = show.description || "ไม่มีคำอธิบาย";
            
            // ✅ Fix: มั่นใจว่าเริ่มมาเป็นแบบย่อ (line-clamp-2) โดยไม่ล้าง class อื่นๆ
            descEl.classList.add('line-clamp-2');

            // Logic ปุ่มกด "เพิ่มเติม" (ย้ายมาจาก player-core เดิม)
            // ใช้ setTimeout เพื่อรอให้ Browser วาด Text เสร็จก่อนคำนวณความสูงจริง
            setTimeout(() => {
                // เช็คว่าข้อความยาวเกินกล่องหรือไม่
                if (descEl.scrollHeight > descEl.clientHeight) {
                    if (expandBtn) {
                        expandBtn.classList.remove('hidden');
                        expandBtn.textContent = 'เพิ่มเติม';
                        
                        // Clone Node เพื่อล้าง Event Listener เก่า (กันกดเบิ้ล)
                        const newBtn = expandBtn.cloneNode(true);
                        expandBtn.parentNode.replaceChild(newBtn, expandBtn);
                        
                        newBtn.onclick = () => {
                            const isClamped = descEl.classList.contains('line-clamp-2');
                            if (isClamped) {
                                descEl.classList.remove('line-clamp-2');
                                newBtn.textContent = 'ย่อ';
                            } else {
                                descEl.classList.add('line-clamp-2');
                                newBtn.textContent = 'เพิ่มเติม';
                            }
                        };
                    }
                } else {
                    // ถ้าข้อความสั้น ให้ซ่อนปุ่ม
                    if (expandBtn) expandBtn.classList.add('hidden');
                }
            }, 50);
        }
    },

    // 3. แสดงวิดีโอ (รับ HTML String มาแปะ)
    renderVideoPlayer(embedHtml) {
        const playerEmbedDiv = document.getElementById('video-player-embed');
        if (playerEmbedDiv) {
            playerEmbedDiv.innerHTML = embedHtml;
        }
    },

    // 4. แสดงข้อความในกล่องวิดีโอ (กรณี Error หรือไม่มีตอน)
    renderVideoMessage(message, isError = false) {
        const playerEmbedDiv = document.getElementById('video-player-embed');
        if (playerEmbedDiv) {
            const colorClass = isError ? 'text-red-500' : 'text-gray-400';
            // ปรับ UI ให้สวยงาม มี Icon และจัดกึ่งกลาง
            playerEmbedDiv.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center bg-black gap-2">
                    <i class="${isError ? 'ri-error-warning-line' : 'ri-movie-line'} text-3xl ${colorClass}"></i>
                    <p class="${colorClass} text-sm">${message}</p>
                </div>`;
        }
    },

    // 5. อัปเดต Meta Tags และ Title Bar (SEO)
    updatePageMeta(metaData) {
        // อัปเดต Title Bar ของ Browser
        document.title = metaData.title;

        // ฟังก์ชันช่วยอัปเดต/สร้าง meta tag
        const setMeta = (property, content) => {
            let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
            if (!el) {
                el = document.createElement('meta');
                if (property.startsWith('twitter')) el.setAttribute('name', property);
                else el.setAttribute('property', property);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        setMeta('og:title', metaData.title);
        setMeta('og:description', metaData.description);
        setMeta('og:image', metaData.image);
        setMeta('og:url', metaData.url);
        setMeta('og:type', 'video.episode');
        setMeta('twitter:card', 'summary_large_image');
        
        // อัปเดตชื่อตอนบน UI (Header ด้านบนวิดีโอ) ถ้ามี element นี้
        const headerTitle = document.getElementById('show-title');
        if (headerTitle && metaData.episodeTitle) {
             headerTitle.textContent = metaData.episodeTitle;
        }
    },

    // 6. จัดการสถานะปุ่ม Next/Prev
    updateNavButtons(canGoPrev, canGoNext) {
        const prevBtn = document.getElementById('prev-episode-btn');
        const nextBtn = document.getElementById('next-episode-btn');
        
        if (prevBtn) {
            prevBtn.disabled = !canGoPrev;
            prevBtn.style.opacity = canGoPrev ? '1' : '0.5';
            prevBtn.style.cursor = canGoPrev ? 'pointer' : 'not-allowed';
        }
        
        if (nextBtn) {
            nextBtn.disabled = !canGoNext;
            nextBtn.style.opacity = canGoNext ? '1' : '0.5';
            nextBtn.style.cursor = canGoNext ? 'pointer' : 'not-allowed';
        }
    }
};
