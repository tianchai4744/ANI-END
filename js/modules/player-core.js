// js/modules/player-core.js
// 🧠 PLAYER CORE: สมองคำนวณข้อมูล (Pure Logic) - ไม่มี DOM Access

import { generateVideoEmbed } from "../utils/tools.js";

// คำนวณ HTML สำหรับฝังวิดีโอ
export function prepareVideoEmbedHtml(episode) {
    if (!episode) return null;

    // รองรับทั้ง videoUrl (ลิงก์ตรง) และ embedCode (iframe)
    const source = episode.videoUrl || episode.embedCode;
    
    if (!source) return null;
    
    return generateVideoEmbed(source);
}

// เตรียมข้อมูล Meta Data สำหรับ SEO และ Title
export function prepareMetaData(show, episode) {
    if (!show) return { title: 'ANI-END', description: '', image: '', url: '', episodeTitle: '' };

    const epText = episode ? ` ตอนที่ ${episode.number}` : '';
    const pageTitle = `${show.title}${epText} | ANI-END`;
    const description = show.description || `ดูอนิเมะ ${show.title} ฟรีที่ ANI-END`;
    const image = show.thumbnailUrl || 'https://placehold.co/600x400?text=ANI-END';
    
    // ชื่อที่จะแสดงบน Header ของหน้าเว็บ
    const episodeTitle = episode ? `${show.title} - ${episode.title || 'ตอนที่ ' + episode.number}` : show.title;

    return {
        title: pageTitle,
        description: description,
        image: image,
        url: window.location.href,
        episodeTitle: episodeTitle
    };
}

// คำนวณสถานะปุ่ม Next/Prev
export function checkNavStatus(currentEpNum, latestEpNum) {
    const current = parseFloat(currentEpNum) || 1;
    const max = parseFloat(latestEpNum) || 9999;
    
    return {
        canGoPrev: current > 1,
        canGoNext: current < max
    };
}

// อัปเดต URL บน Address Bar โดยไม่ต้อง Refresh หน้า (History API)
export function updateUrlState(episodeId) {
    if (!episodeId) return;
    try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('ep_id', episodeId);
        window.history.pushState({}, '', newUrl.href);
    } catch (e) {
        console.warn("Cannot update URL:", e);
    }
}
