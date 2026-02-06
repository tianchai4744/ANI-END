import { generateVideoEmbed } from "../utils/tools.js";

// ตั้งค่าข้อมูลพื้นฐานของหน้า (Title, Description)
export function setupPlayerInfo(showData) {
    document.getElementById('show-title').textContent = showData.title;
    
    const descEl = document.getElementById('show-description');
    const expandBtn = document.getElementById('expand-desc-btn');
    
    descEl.textContent = showData.description || "ไม่มีคำอธิบาย";
    
    // Logic ปุ่ม "เพิ่มเติม/ย่อ"
    if (descEl.scrollHeight > descEl.clientHeight) {
        expandBtn.classList.remove('hidden');
        expandBtn.onclick = () => {
            descEl.classList.toggle('line-clamp-2');
            expandBtn.textContent = descEl.classList.contains('line-clamp-2') ? 'เพิ่มเติม' : 'ย่อ';
        };
    }
}

// ฝังวิดีโอลงใน Player
export function embedEpisode(episode) {
    const playerEmbedDiv = document.getElementById('video-player-embed');
    playerEmbedDiv.innerHTML = ''; 

    if (!episode) {
        playerEmbedDiv.innerHTML = `<p class="text-gray-400 p-4">ยังไม่มีตอนสำหรับอนิเมะนี้</p>`;
        return;
    }

    const source = episode.videoUrl || episode.embedCode;
    if (!source) {
        playerEmbedDiv.innerHTML = `<p class="text-red-500 p-4">ไม่พบลิงก์วิดีโอ</p>`;
        return;
    }
    
    playerEmbedDiv.innerHTML = generateVideoEmbed(source);
}

// อัปเดต Page Title และ URL
export function updatePlayerMetadata(show, episode) {
    if (!show) return;
    const epText = episode ? ` ตอนที่ ${episode.number}` : '';
    document.title = `${show.title}${epText} | ANI-END`;
    
    if (episode) {
        const titleEl = document.getElementById('show-title');
        titleEl.textContent = `${show.title} - ${episode.title || 'ตอนที่ ' + episode.number}`;
        
        // Update URL without reload
        try {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('ep_id', episode.id);
            window.history.pushState({}, '', newUrl.href);
        } catch (e) {}
    }
}
