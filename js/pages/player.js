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

// Sub-Modules (Modules เหล่านี้ใช้เหมือนเดิม)
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
        PlayerRenderer.renderVideoMessage("ไม่พบลิงก์วิดีโอ หรือลิงก์เสีย", true);
    }
    
    PlayerRenderer.updatePageMeta(metaData);
    PlayerRenderer.updateNavButtons(navStatus.canGoPrev, navStatus.canGoNext);
    
    // 3. Update Browser State (URL)
    PlayerLogic.updateUrlState(episode.id);

    // 4. Call External Services (บันทึกประวัติ / ยอดวิว)
    if (currentUser) saveHistory(currentUser.uid, currentShow, episode);
    trackView(currentShow.id);
    
    // 5. Update Other UI Components (ส่วนประกอบเสริม)
    highlightActiveEpisode(episode.id);
    updateReportUI(episode);
    initCommentSystem(currentShow.id, episode.id, episode.number);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Navigation Handler ---
async function navigateEpisode(direction) {
    if (!currentEpisode) return;
    
    // ปิดปุ่มชั่วคราวกันกดรัว
    PlayerRenderer.updateNavButtons(false, false);

    try {
        const nextEp = await findNextPrevEpisode(currentEpisode.number, direction, currentShow);
        
        if (nextEp) {
            // เช็คว่าต้องโหลดตอนชุดใหม่ไหม (Batch Loading)
            await checkAndLoadEpisodeBatch(nextEp.number, playEpisode);
            playEpisode(nextEp);
        } else {
            // ถ้าไปต่อไม่ได้ ให้คืนสถานะปุ่มตามจริง
            const navStatus = PlayerLogic.checkNavStatus(currentEpisode.number, currentShow.latestEpisodeNumber);
            PlayerRenderer.updateNavButtons(navStatus.canGoPrev, navStatus.canGoNext);
        }
    } catch(e) { 
        console.error("Navigation Error:", e);
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
    const prevBtn = document.getElementById('prev-episode-btn');
    const nextBtn = document.getElementById('next-episode-btn');
    const commentBtn = document.getElementById('btn-post-comment');

    if(prevBtn) prevBtn.onclick = () => navigateEpisode('prev');
    if(nextBtn) nextBtn.onclick = () => navigateEpisode('next');
    if(commentBtn) commentBtn.addEventListener('click', () => postComment(currentUser));

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
            
            // Render Top 10 (Lazy Load Image)
            renderPlayerTop10(historyItems);
            const top10Container = document.getElementById('top10-list-container');
            if (top10Container) setTimeout(() => observeImages(top10Container), 500);

            // 5. Init Episode List & Play
            // โหลดรายการตอนทั้งหมดเข้ามาก่อน
            await initEpisodeList(showId, currentShow.latestEpisodeNumber, playEpisode);

            if (targetEpId) {
                // กรณีมี ID ตอนระบุมา (จาก URL หรือ History)
                const epSnap = await getDoc(doc(db, `artifacts/${appId}/public/data/episodes`, targetEpId));
                if (epSnap.exists()) {
                    const epData = { id: epSnap.id, ...epSnap.data() };
                    targetEpNum = epData.number;
                    // โหลด Batch ที่ตอนนั้นอยู่
                    await checkAndLoadEpisodeBatch(targetEpNum, playEpisode);
                    playEpisode(epData);
                } else {
                     // ถ้าหาตอนไม่เจอ ให้โหลดตอนที่ 1 มาเตรียมไว้
                     await checkAndLoadEpisodeBatch(1, playEpisode);
                     PlayerRenderer.renderVideoMessage("ไม่พบตอนที่ระบุ กรุณาเลือกจากรายการด้านล่าง");
                }
            } else {
                // กรณีไม่มี ID ระบุมา (เปิดครั้งแรกแบบไม่มีประวัติ)
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

    // Handle Browser Back Button
    window.addEventListener('popstate', () => window.location.reload());
});
