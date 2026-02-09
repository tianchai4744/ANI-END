// js/pages/player.js
// 🎮 CONTROLLER: ผู้สั่งการ (Main Entry Point)
// หน้าที่: เชื่อมต่อ Core -> Renderer และจัดการ Event Listeners

import { onAuthStateChanged } from "firebase/auth";
import { setLogLevel } from "firebase/firestore";
import { auth } from "../config/db-config.js";

// Import "The Brain" and "The Body"
import * as Core from "../modules/player-core.js";
import { PlayerRenderer } from "../renderers/player-renderer.js";

// Import Modules (Side Features)
import { loadNavbar } from "../modules/navbar.js";
import { setupSearchSystem } from "../modules/search.js";
import { observeImages } from "../utils/tools.js";
import * as EpListModule from "../modules/episode-list.js"; // ใช้ทั้ง Module
import { initBookmarkSystem } from "../modules/bookmark-manager.js";
import { loadWatchHistory } from "../modules/watch-service.js";
import { initReportSystem, updateReportUI } from "../modules/report-service.js";
import { renderRelatedAnime } from "../modules/player-related.js";
import { renderPlayerTop10 } from "../modules/player-top10.js";
import { initCommentSystem, postComment, updateCommentUIState } from "../modules/comments.js";

let currentUser = null;
let isFirstLoad = true;

// --- 1. Main Action: Play Episode ---
async function handlePlayEpisode(episode) {
    if (!episode) {
        PlayerRenderer.renderErrorState("ไม่พบข้อมูลตอน");
        return;
    }

    // 1. Ask Core to prepare everything
    const context = Core.preparePlaybackContext(episode, currentUser);
    if (!context) return;

    // 2. Command Renderer to update UI
    PlayerRenderer.renderPlayer(context.embedHtml);
    PlayerRenderer.updateMetaData(context.metaData);
    PlayerRenderer.updateNavButtons(context.navStatus);

    // 3. Update Side Modules (UI Components)
    EpListModule.highlightActiveEpisode(context.episodeId);
    updateReportUI(episode);
    initCommentSystem(context.showId, context.episodeId, context.episodeNumber);

    // Scroll top on mobile
    if (!isFirstLoad) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    isFirstLoad = false;
}

// --- 2. Navigation Handler ---
async function handleNavigation(direction) {
    PlayerRenderer.updateNavButtons({ canGoPrev: false, canGoNext: false }); // Lock buttons

    try {
        // Ask Core/Module for the next episode
        const nextEp = await Core.determineNextAction(direction, EpListModule);
        
        if (nextEp) {
            await EpListModule.checkAndLoadEpisodeBatch(nextEp.number, handlePlayEpisode);
            handlePlayEpisode(nextEp);
        } else {
            // Revert button state if failed
            const state = Core.getState();
            // Recalculate status manually or ask core
            // For simplicity, just re-render current state logic
            if (state.currentEpisode) {
                 // Re-trigger context logic just to get nav status back
                 const context = Core.preparePlaybackContext(state.currentEpisode, currentUser);
                 PlayerRenderer.updateNavButtons(context.navStatus);
            }
        }
    } catch (e) {
        console.error("Nav Error:", e);
    }
}

// --- 3. Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    setLogLevel('silent');
    await loadNavbar('..');
    
    // Bind Global Events
    document.getElementById('prev-episode-btn')?.addEventListener('click', () => handleNavigation('prev'));
    document.getElementById('next-episode-btn')?.addEventListener('click', () => handleNavigation('next'));
    document.getElementById('btn-post-comment')?.addEventListener('click', () => postComment(currentUser));

    PlayerRenderer.toggleLoading(true);

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        updateCommentUIState(user);

        const urlParams = new URLSearchParams(window.location.search);
        const showId = urlParams.get('id');
        const epIdParam = urlParams.get('ep_id');

        if (!showId) {
            PlayerRenderer.toggleLoading(true, "URL ไม่ถูกต้อง (Missing Show ID)");
            return;
        }

        try {
            // A. Load Data via Core
            const show = await Core.fetchShowData(showId);
            PlayerRenderer.renderShowInfo(show);

            // B. Load User Context
            let historyItems = [];
            if (user) {
                historyItems = await loadWatchHistory(user.uid);
            }
            setupSearchSystem(historyItems);

            // C. Initialize Side Modules
            initBookmarkSystem(user, show);
            initReportSystem(user, show, () => Core.getState().currentEpisode);
            renderRelatedAnime(show, historyItems);
            renderPlayerTop10(historyItems);
            setTimeout(() => observeImages(document.getElementById('top10-list-container')), 1000);

            // D. Determine Starting Episode
            let startEpId = epIdParam;
            
            // ถ้าไม่มี URL Param ให้ดูจากประวัติ
            if (!startEpId && historyItems.length > 0) {
                const lastWatched = historyItems.find(h => h.showId === showId);
                if (lastWatched) startEpId = lastWatched.lastWatchedEpisodeId;
            }

            // E. Init Episode List
            await EpListModule.initEpisodeList(showId, show.latestEpisodeNumber, handlePlayEpisode);

            // F. Play!
            if (startEpId) {
                const epData = await Core.fetchEpisodeData(startEpId);
                if (epData) {
                    await EpListModule.checkAndLoadEpisodeBatch(epData.number, handlePlayEpisode);
                    handlePlayEpisode(epData);
                } else {
                    // Fallback to Ep 1
                    await EpListModule.checkAndLoadEpisodeBatch(1, handlePlayEpisode);
                    PlayerRenderer.renderErrorState("ไม่พบตอนที่ระบุ กรุณาเลือกจากรายการ");
                }
            } else {
                // First time watch -> Load batch 1 and play first available
                const episodes = await EpListModule.loadEpisodesByRange(1, 50, document.getElementById('episode-list-container'), handlePlayEpisode);
                if (episodes?.length > 0) handlePlayEpisode(episodes[0]);
                else PlayerRenderer.renderErrorState("ยังไม่มีตอนในขณะนี้");
            }

            PlayerRenderer.toggleLoading(false);

        } catch (error) {
            PlayerRenderer.toggleLoading(true, `Error: ${error.message}`);
        }
    });
    
    window.addEventListener('popstate', () => window.location.reload());
});
