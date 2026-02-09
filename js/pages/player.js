// js/pages/player.js
// 🎮 CONTROLLER: ผู้สั่งการ (Main Entry Point)

import { onAuthStateChanged } from "firebase/auth";
import { setLogLevel } from "firebase/firestore";
import { auth } from "../config/db-config.js";

import * as Core from "../modules/player-core.js";
import { PlayerRenderer } from "../renderers/player-renderer.js";

import { loadNavbar } from "../modules/navbar.js";
import { setupSearchSystem } from "../modules/search.js";
import { observeImages } from "../utils/tools.js";
import * as EpListModule from "../modules/episode-list.js";
import { initBookmarkSystem } from "../modules/bookmark-manager.js";
import { loadWatchHistory } from "../modules/watch-service.js";
import { initReportSystem, updateReportUI } from "../modules/report-service.js";
import { renderRelatedAnime } from "../modules/player-related.js";
import { renderPlayerTop10 } from "../modules/player-top10.js";
import { initCommentSystem, postComment, updateCommentUIState } from "../modules/comments.js";

let currentUser = null;
let isFirstLoad = true;
let isSearchInitialized = false;

// --- 1. Main Action: Play Episode ---
async function handlePlayEpisode(episode) {
    if (!episode) {
        PlayerRenderer.renderErrorState("ไม่พบข้อมูลตอน");
        return;
    }

    const context = Core.preparePlaybackContext(episode, currentUser);
    if (!context) return;

    PlayerRenderer.renderPlayer(context.embedHtml);
    PlayerRenderer.updateMetaData(context.metaData);
    PlayerRenderer.updateNavButtons(context.navStatus);

    EpListModule.highlightActiveEpisode(context.episodeId);
    updateReportUI(episode);
    initCommentSystem(context.showId, context.episodeId, context.episodeNumber);

    if (!isFirstLoad) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    isFirstLoad = false;
}

// --- 2. Navigation Handler ---
async function handleNavigation(direction) {
    PlayerRenderer.updateNavButtons({ canGoPrev: false, canGoNext: false });

    try {
        const nextEp = await Core.determineNextAction(direction, EpListModule);
        
        if (nextEp) {
            await EpListModule.checkAndLoadEpisodeBatch(nextEp.number, handlePlayEpisode);
            handlePlayEpisode(nextEp);
        } else {
            const state = Core.getState();
            if (state.currentEpisode) {
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
            
            if (!isSearchInitialized) {
                setupSearchSystem(historyItems || []);
                isSearchInitialized = true;
            }

            // C. Initialize Side Modules
            initBookmarkSystem(user, show);
            initReportSystem(user, show, () => Core.getState().currentEpisode);
            renderRelatedAnime(show, historyItems);
            renderPlayerTop10(historyItems);
            setTimeout(() => observeImages(document.getElementById('top10-list-container')), 1000);

            // D. Determine Starting Episode
            let startEpId = epIdParam;
            
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
                    await EpListModule.checkAndLoadEpisodeBatch(1, handlePlayEpisode);
                    PlayerRenderer.renderErrorState("ไม่พบตอนที่ระบุ กรุณาเลือกจากรายการ");
                }
            } else {
                const episodes = await EpListModule.loadEpisodesByRange(1, 50, document.getElementById('episode-list-container'), handlePlayEpisode);
                if (episodes?.length > 0) handlePlayEpisode(episodes[0]);
                else PlayerRenderer.renderErrorState("ยังไม่มีตอนในขณะนี้");
            }

            // ✅ เปิดเนื้อหา แล้วค่อยคำนวณปุ่มเพิ่มเติม
            PlayerRenderer.toggleLoading(false);
            PlayerRenderer.checkDescriptionOverflow(); 

        } catch (error) {
            PlayerRenderer.toggleLoading(true, `Error: ${error.message}`);
        }
    });
    
    window.addEventListener('popstate', () => window.location.reload());
});
