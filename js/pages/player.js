// js/pages/player.js

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setLogLevel } from "firebase/firestore";
import { db, auth, appId } from "../config/db-config.js";

// Core Modules
import { loadNavbar } from "../modules/navbar.js";
import { setupSearchSystem } from "../modules/search.js";
import { observeImages } from "../utils/tools.js"; // ✅ นำเข้า observeImages

// Player Modules
import { setupPlayerInfo, embedEpisode, updatePlayerMetadata } from "../modules/player-core.js";
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

// Orchestrator Function
async function playEpisode(episode) {
    if (!episode) return;
    currentEpisode = episode;
    
    // 1. UI Updates
    embedEpisode(episode);
    updatePlayerMetadata(currentShow, episode);
    
    // 2. Services
    if (currentUser) saveHistory(currentUser.uid, currentShow, episode);
    trackView(currentShow.id);
    
    // 3. Components Update
    highlightActiveEpisode(episode.id);
    updateReportUI(episode);
    updateNavButtons(episode.number);
    
    // 4. Comments
    initCommentSystem(currentShow.id, episode.id, episode.number);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavButtons(currentNum) {
    const prevBtn = document.getElementById('prev-episode-btn');
    const nextBtn = document.getElementById('next-episode-btn');
    const maxEp = currentShow.latestEpisodeNumber || 9999;
    
    if(prevBtn) prevBtn.disabled = (currentNum <= 1);
    if(nextBtn) nextBtn.disabled = (currentNum >= maxEp);
}

// Navigation Handler
async function navigateEpisode(direction) {
    if (!currentEpisode) return;
    
    const btn = direction === 'next' ? document.getElementById('next-episode-btn') : document.getElementById('prev-episode-btn');
    btn.disabled = true; 

    try {
        const nextEp = await findNextPrevEpisode(currentEpisode.number, direction, currentShow);
        
        if (nextEp) {
            await checkAndLoadEpisodeBatch(nextEp.number, playEpisode);
            playEpisode(nextEp);
        }
    } catch(e) { console.error(e); }
    finally { btn.disabled = false; }
}

// Main Initialization
document.addEventListener('DOMContentLoaded', async () => {
    setLogLevel('silent');
    await loadNavbar('..');
    
    const loadingPlayer = document.getElementById('loading-player');
    const playerContent = document.getElementById('player-content-wrapper');
    
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
            loadingPlayer.innerHTML = '<p class="text-red-500">URL ไม่ถูกต้อง</p>';
            return;
        }

        try {
            // 1. Fetch Show Data
            const showSnap = await getDoc(doc(db, `artifacts/${appId}/public/data/shows`, showId));
            if (!showSnap.exists()) throw new Error("ไม่พบข้อมูลอนิเมะ");
            currentShow = { id: showSnap.id, ...showSnap.data() };

            setupPlayerInfo(currentShow);
            
            // 2. Load User History
            if (user) {
                historyItems = await loadWatchHistory(user.uid);
                if (!isSearchInitialized) { setupSearchSystem(historyItems); isSearchInitialized = true; }
            } else {
                if (!isSearchInitialized) { setupSearchSystem([]); isSearchInitialized = true; }
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
            
            // ✅ Render Top 10 และเรียก Lazy Load (เพื่อแก้ปัญหา Top 10 ไม่โหลดภาพ)
            renderPlayerTop10(historyItems);
            setTimeout(() => observeImages(document.getElementById('top10-list-container')), 500);

            // 5. Init Episode List & Play
            if (targetEpId) {
                const epSnap = await getDoc(doc(db, `artifacts/${appId}/public/data/episodes`, targetEpId));
                if (epSnap.exists()) {
                    const epData = { id: epSnap.id, ...epSnap.data() };
                    targetEpNum = epData.number;
                    await initEpisodeList(showId, currentShow.latestEpisodeNumber, playEpisode);
                    await checkAndLoadEpisodeBatch(targetEpNum, playEpisode);
                    playEpisode(epData);
                } else {
                     await initEpisodeList(showId, currentShow.latestEpisodeNumber, playEpisode);
                     await checkAndLoadEpisodeBatch(1, playEpisode);
                }
            } else {
                await initEpisodeList(showId, currentShow.latestEpisodeNumber, playEpisode);
                const episodes = await loadEpisodesByRange(1, 50, document.getElementById('episode-list-container'), playEpisode);
                if (episodes.length > 0) playEpisode(episodes[0]);
                else embedEpisode(null);
            }

            // Reveal UI
            loadingPlayer.classList.add('hidden');
            playerContent.classList.remove('hidden');

        } catch (error) {
            console.error(error);
            loadingPlayer.innerHTML = `<p class="text-red-500">เกิดข้อผิดพลาด: ${error.message}</p>`;
        }
    });

    window.addEventListener('popstate', () => window.location.reload());
});
