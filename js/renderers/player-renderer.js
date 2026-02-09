// js/renderers/player-renderer.js
// 🎨 PLAYER RENDERER: รับผิดชอบเรื่องหน้าตาและการแสดงผลเท่านั้น (ห้ามมี Logic คำนวณ)

export const PlayerRenderer = {
    // 1. จัดการหน้า Loading
    toggleLoading(isLoading, errorMessage = null) {
        const loader = document.getElementById('loading-player');
        const content = document.getElementById('player-content-wrapper');
        
        if (isLoading) {
            if (loader) {
                loader.classList.remove('hidden');
                // ถ้ามี error ให้แสดงข้อความ
                if (errorMessage) loader.innerHTML = `<p class="text-red-500 text-center mt-4">${errorMessage}</p>`;
                else loader.innerHTML = `<div class="spinner"></div>`; // หรือใส่ HTML Loading เดิมของคุณ
            }
            if (content) content.classList.add('hidden');
        } else {
            if (loader) loader.classList.add('hidden');
            if (content) content.classList.remove('hidden');
        }
    },

    // 2. แสดงข้อมูลอนิเมะ (ชื่อ, รายละเอียด)
    renderShowInfo(show) {
        if (!show) return;
        
        const titleEl = document.getElementById('show-title');
        const descEl = document.getElementById('show-description');
        const expandBtn = document.getElementById('expand-desc-btn');

        if (titleEl) titleEl.textContent = show.title;
        
        if (descEl) {
            descEl.textContent = show.description || "ไม่มีคำอธิบาย";
            
            // Logic ปุ่มกด "เพิ่มเติม" (ถือเป็น UI Logic ทำที่นี่ได้เลย)
            if (descEl.scrollHeight > descEl.clientHeight) {
                if (expandBtn) {
                    expandBtn.classList.remove('hidden');
                    // ล้าง Event เดิมก่อนกันเบิ้ล (Best Practice)
                    const newBtn = expandBtn.cloneNode(true);
                    expandBtn.parentNode.replaceChild(newBtn, expandBtn);
                    
                    newBtn.onclick = () => {
                        descEl.classList.toggle('line-clamp-2');
                        newBtn.textContent = descEl.classList.contains('line-clamp-2') ? 'เพิ่มเติม' : 'ย่อ';
                    };
                }
            } else {
                if (expandBtn) expandBtn.classList.add('hidden');
            }
        }
    },

    // 3. แสดงวิดีโอ (รับ HTML String มาแปะเลย)
    renderVideoPlayer(embedHtml) {
        const playerEmbedDiv = document.getElementById('video-player-embed');
        if (playerEmbedDiv) {
            playerEmbedDiv.innerHTML = embedHtml;
        }
    },

    // 4. อัปเดตชื่อเว็บและ Meta Tags (SEO)
    updatePageMeta(metaData) {
        // เปลี่ยน Title Bar
        document.title = metaData.title;

        // ฟังก์ชันช่วยอัปเดต tag
        const setMeta = (prop, content) => {
            let el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(prop.startsWith('twitter') ? 'name' : 'property', prop);
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
        
        // อัปเดต Title ในหน้าจอ (ถ้ามี)
        const screenTitle = document.getElementById('show-title');
        if (screenTitle && metaData.episodeTitle) {
            screenTitle.textContent = metaData.episodeTitle;
        }
    },

    // 5. จัดการปุ่ม ถัดไป/ก่อนหน้า
    updateNavButtons(canGoPrev, canGoNext) {
        const prevBtn = document.getElementById('prev-episode-btn');
        const nextBtn = document.getElementById('next-episode-btn');
        
        if (prevBtn) prevBtn.disabled = !canGoPrev;
        if (nextBtn) nextBtn.disabled = !canGoNext;
    },
    
    // 6. ล้าง Error/Message ในกล่องวิดีโอ
    renderVideoMessage(message, isError = false) {
        const playerEmbedDiv = document.getElementById('video-player-embed');
        if (playerEmbedDiv) {
            const colorClass = isError ? 'text-red-500' : 'text-gray-400';
            playerEmbedDiv.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-black"><p class="${colorClass} p-4">${message}</p></div>`;
        }
    }
};
