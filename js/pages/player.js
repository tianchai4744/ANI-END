// js/pages/player.js
// 🎮 CONTROLLER: ผู้สั่งการ (เชื่อม Logic เข้ากับ Renderer)

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setLogLevel } from "firebase/firestore";
import { db, auth, appId } from "../config/db-config.js";

// Core Modules & Renderers
import { loadNavbar } from "../modules/navbar.js";
import { setupSearchSystem } from "../modules/search.js";
import { observeImages } from "../utils/tools.js";
import * as PlayerLogic from "../modules/player-core.js"; // 🧠 นำเข้าสมอง (แบบใหม่)
import { PlayerRenderer } from "../renderers/player-renderer.js"; // 🎨 นำเข้าร่างกาย (แบบใหม่)

// Sub-Modules (Modules เหล่านี้ยังคงเดิมไว้ก่อน)
import { initEpisodeList, loadEpisodesByRange, highlightActiveEpisode, findNextPrevEpisode, checkAndLoadEpisodeBatch } from "../modules/episode-list.js";
import { initBookmarkSystem } from "../modules/bookmark-manager.js";
import { trackView, saveHistory, loadWatchHistory } from "../modules/watch-service.js";
import { initReportSystem, updateReportUI } from "../modules/report-service.js";
import { renderRelatedAnime } from "../modules/player-related.js";
import { renderPlayerTop10 } from "../modules/player-top10.js";
import { initCommentSystem, postComment, updateCommentUIState } from "../modules/comments.js";

// Global State
let currentUser = null;
let currentShow = null;
let currentEpisode = null;
let historyItems = []; 
let isSearchInitialized = false;

// --- Orchestrator Function (ฟังก์ชันหลักที่ควบคุมการเล่น) ---
async function playEpisode(episode) {
    if (!episode) {
        PlayerRenderer.renderVideoMessage("ไม่พบข้อมูลตอนที่ระบุ", true);
        return;
    }
    currentEpisode = episode;
    
    // 1. Prepare Data (ถามสมอง)
    const embedHtml = PlayerLogic.prepareVideoEmbedHtml(episode);
    const metaData = PlayerLogic.prepareMetaData(currentShow, episode);
    const navStatus = PlayerLogic.checkNavStatus(episode.number, currentShow.latestEpisodeNumber);

    // 2. Update UI (สั่งร่างกาย)
    if (embedHtml) {
        PlayerRenderer.renderVideoPlayer(embedHtml);
    } else {
        PlayerRenderer.renderVideoMessage("ไม่พบลิงก์วิดีโอ", true);
    }
    
    PlayerRenderer.updatePageMeta(metaData);
    PlayerRenderer.updateNavButtons(navStatus.canGoPrev, navStatus.canGoNext);
    
    // 3. Update Browser State (URL)
    PlayerLogic.updateUrlState(episode.id);

    // 4. Call External Services (เรียก service อื่นๆ)
    if (currentUser) saveHistory(currentUser.uid, currentShow, episode);
    trackView(currentShow.id);
    
    // 5. Update Other UI Components
    highlightActiveEpisode(episode.id);
    updateReportUI(episode);
    initCommentSystem(currentShow.id, episode.id, episode.number);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Navigation Handler ---
async function navigateEpisode(direction) {
    if (!currentEpisode) return;
    
    // ปิดปุ่มชั่วคราวผ่าน Renderer
    PlayerRenderer.updateNavButtons(false, false);

    try {
        const nextEp = await findNextPrevEpisode(currentEpisode.number, direction, currentShow);
        if (nextEp) {
            await checkAndLoadEpisodeBatch(nextEp.number, playEpisode);
            playEpisode(nextEp);
        } else {
            // คืนสถานะปุ่มถ้าไปต่อไม่ได้
            const navStatus = PlayerLogic.checkNavStatus(currentEpisode.number, currentShow.latestEpisodeNumber);
            PlayerRenderer.updateNavButtons(navStatus.canGoPrev, navStatus.canGoNext);
        }
    } catch(e) { 
        console.error(e);
        // คืนสถานะปุ่มกรณี Error
        const navStatus = PlayerLogic.checkNavStatus(currentEpisode.number, currentShow.latestEpisodeNumber);
        PlayerRenderer.updateNavButtons(navStatus.canGoPrev, navStatus.canGoNext);
    }
}

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    setLogLevel('silent');
    await loadNavbar('..');
    
    // เริ่มต้นแสดง Loading
    PlayerRenderer.toggleLoading(true);
    
    // Event Bindings
    document.getElementById('prev-episode-btn').onclick = () => navigateEpisode('prev');
    document.getElementById('next-episode-btn').onclick = () => navigateEpisode('next');
    document.getElementById('btn-post-comment')?.addEventListener('click', () => postComment(currentUser));

    // Auth & Data Loading
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        updateCommentUIState(user);
        
        const urlParams = new URLSearchParams(window.location.search);
        const showId = urlParams.get('id');
        const epIdFromUrl = urlParams.get('ep_id');

        if (!showId) {
            PlayerRenderer.toggleLoading(true, "URL ไม่ถูกต้อง (Missing Show ID)");
            return;
        }

        try {
            // 1. Fetch Show Data
            const showSnap = await getDoc(doc(db, `artifacts/${appId}/public/data/shows`, showId));
            if (!showSnap.exists()) throw new Error("ไม่พบข้อมูลอนิเมะในระบบ");
            currentShow = { id: showSnap.id, ...showSnap.data() };

            // Render ข้อมูลพื้นฐานทันที
            PlayerRenderer.renderShowInfo(currentShow);
            
            // 2. Load User History
            if (user) {
                historyItems = await loadWatchHistory(user.uid);
            }
            // Setup Search (ทำครั้งเดียว)
            if (!isSearchInitialized) { 
                setupSearchSystem(historyItems || []); 
                isSearchInitialized = true; 
            }

            // 3. Determine Episode to Play
            let targetEpId = epIdFromUrl;
            let targetEpNum = 1;

            if (!targetEpId && historyItems.length > 0) {
                const history = historyItems.find(h => h.showId === showId);
                if (history) targetEpId = history.lastWatchedEpisodeId;
            }

            // 4. Init Components
            initBookmarkSystem(user, currentShow);
            initReportSystem(user, currentShow, () => currentEpisode); 
            renderRelatedAnime(currentShow, historyItems);
            
            // Render Top 10
            renderPlayerTop10(historyItems);
            setTimeout(() => observeImages(document.getElementById('top10-list-container')), 500);

            // 5. Init Episode List & Play
            await initEpisodeList(showId, currentShow.latestEpisodeNumber, playEpisode);

            if (targetEpId) {
                const epSnap = await getDoc(doc(db, `artifacts/${appId}/public/data/episodes`, targetEpId));
                if (epSnap.exists()) {
                    const epData = { id: epSnap.id, ...epSnap.data() };
                    targetEpNum = epData.number;
                    await checkAndLoadEpisodeBatch(targetEpNum, playEpisode);
                    playEpisode(epData);
                } else {
                     await checkAndLoadEpisodeBatch(1, playEpisode);
                     // กรณีหาไม่เจอ ให้ลองเล่นตอนที่ 1 แทน (หรือแจ้งเตือน)
                     // แต่ต้องดึงข้อมูลตอนที่ 1 มาก่อน ซึ่ง logic เดิมอาจจะซับซ้อน
                     // ในที่นี้เราปล่อยให้ list จัดการ หรือ user กดเลือกเอง
                     PlayerRenderer.renderVideoMessage("กรุณาเลือกตอนที่จะรับชม");
                }
            } else {
                // ไม่มี target ID, โหลด list ช่วงแรก แล้วเล่นตอนแรกสุดที่มี
                const episodes = await loadEpisodesByRange(1, 50, document.getElementById('episode-list-container'), playEpisode);
                if (episodes && episodes.length > 0) {
                    playEpisode(episodes[0]);
                } else {
                    PlayerRenderer.renderVideoMessage("ยังไม่มีตอนสำหรับอนิเมะเรื่องนี้");
                }
            }

            // ปิด Loading แสดงหน้าจอจริง
            PlayerRenderer.toggleLoading(false);

        } catch (error) {
            console.error(error);
            PlayerRenderer.toggleLoading(true, `เกิดข้อผิดพลาด: ${error.message}`);
        }
    });

    window.addEventListener('popstate', () => window.location.reload());
});
