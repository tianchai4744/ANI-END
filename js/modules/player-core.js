// js/modules/player-core.js
// 🧠 PLAYER CORE: สมองและศูนย์กลางข้อมูล (Business Logic & State Management)
// หน้าที่: ดึงข้อมูล, คำนวณ, ถือ State, และเตรียมข้อมูลให้ UI

import { doc, getDoc } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";
import { generateVideoEmbed } from "../utils/tools.js";
import { trackView, saveHistory } from "../modules/watch-service.js";

// --- State Management (Single Point of Truth) ---
const state = {
    currentShow: null,
    currentEpisode: null,
    user: null,
    history: []
};

// --- Data Fetching Methods (คุยกับ DB ที่นี่ที่เดียว) ---

export async function fetchShowData(showId) {
    if (!showId) throw new Error("Missing Show ID");
    
    try {
        const docRef = doc(db, `artifacts/${appId}/public/data/shows`, showId);
        const snap = await getDoc(docRef);
        
        if (!snap.exists()) throw new Error("Show not found");
        
        state.currentShow = { id: snap.id, ...snap.data() };
        return state.currentShow;
    } catch (error) {
        console.error("Error fetching show:", error);
        throw error;
    }
}

export async function fetchEpisodeData(episodeId) {
    if (!episodeId) return null;
    
    try {
        const docRef = doc(db, `artifacts/${appId}/public/data/episodes`, episodeId);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching episode:", error);
        return null;
    }
}

// --- Business Logic Methods ---

// เตรียมข้อมูลสำหรับการเล่นวิดีโอ (Side Effects: บันทึกประวัติ, นับวิว)
export function preparePlaybackContext(episode, user) {
    if (!episode || !state.currentShow) return null;

    state.currentEpisode = episode;
    state.user = user;

    // 1. Business Logic: บันทึกประวัติและยอดวิว (Fire and Forget)
    if (user) {
        saveHistory(user.uid, state.currentShow, episode);
    }
    trackView(state.currentShow.id);
    
    // 2. Update Browser URL (Pure Logic)
    updateUrlState(episode.id);

    // 3. Prepare Data for UI
    return {
        embedHtml: _generateEmbed(episode),
        metaData: _generateMetaData(state.currentShow, episode),
        navStatus: _calculateNavStatus(episode.number, state.currentShow.latestEpisodeNumber),
        episodeId: episode.id,
        episodeNumber: episode.number,
        showId: state.currentShow.id
    };
}

// คำนวณหาตอนถัดไป/ก่อนหน้า
export async function determineNextAction(direction, episodeListModule) {
    if (!state.currentEpisode || !state.currentShow) return null;

    // Delegate ให้ Module รายการตอนช่วยหา (เนื่องจาก Logic การหาตอนค่อนข้างซับซ้อน)
    // แต่ Core เป็นคนสั่ง
    return await episodeListModule.findNextPrevEpisode(
        state.currentEpisode.number, 
        direction, 
        state.currentShow
    );
}

// --- Helper / Private Logic ---

function _generateEmbed(episode) {
    const source = episode.videoUrl || episode.embedCode;
    return source ? generateVideoEmbed(source) : null;
}

function _generateMetaData(show, episode) {
    const epText = episode ? ` ตอนที่ ${episode.number}` : '';
    return {
        title: `${show.title}${epText} | ANI-END`,
        description: show.description || `ดูอนิเมะ ${show.title} ฟรี`,
        image: show.thumbnailUrl || 'https://placehold.co/600x400',
        url: window.location.href,
        episodeTitle: `${show.title} - ${episode.title || 'ตอนที่ ' + episode.number}`
    };
}

function _calculateNavStatus(currentEpNum, latestEpNum) {
    const current = parseFloat(currentEpNum) || 1;
    const max = parseFloat(latestEpNum) || 9999;
    return {
        canGoPrev: current > 1,
        canGoNext: current < max
    };
}

function updateUrlState(episodeId) {
    if (!episodeId) return;
    try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('ep_id', episodeId);
        window.history.pushState({}, '', newUrl.href);
    } catch (e) {
        console.warn("URL update failed:", e);
    }
}

// Getter สำหรับ State ปัจจุบัน (เพื่อให้ UI อื่นๆ ดึงไปใช้ได้ถ้าจำเป็น)
export const getState = () => ({ ...state });
