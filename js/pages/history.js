// js/pages/history.js
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, collection, query, limit, orderBy, deleteDoc, doc, setLogLevel } from "firebase/firestore";
import { db, auth, appId } from "../config/db-config.js";
import { setupSearchSystem } from "../modules/search.js";
import { loadNavbar } from "../modules/navbar.js";
import { observeImages } from "../utils/tools.js";

let userId;
let historyItems = [];

let historyListContainer, loadingState, emptyState, loginRequiredState, clearHistoryBtn;

function formatDateTime(timestamp) {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

async function initializeFirebase() {
    setLogLevel('silent');
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            loginRequiredState.classList.add('hidden');
            setupHistoryListener();
        } else {
            loadingState.classList.add('hidden');
            loginRequiredState.classList.remove('hidden');
            emptyState.classList.add('hidden');
            historyListContainer.innerHTML = '';
            clearHistoryBtn.classList.add('hidden');
            setupSearchSystem([]); 
        }
    });
}

function setupHistoryListener() {
    const historyRef = collection(db, `artifacts/${appId}/users/${userId}/viewHistory`);
    const q = query(historyRef, orderBy("watchedAt", "desc"), limit(50));
    
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    historyListContainer.innerHTML = '';
    
    onSnapshot(q, (snapshot) => {
        loadingState.classList.add('hidden');
        historyItems.length = 0;
        
        if (snapshot.empty) {
            emptyState.classList.remove('hidden');
            clearHistoryBtn.classList.add('hidden');
            setupSearchSystem([]);
            return;
        }
        
        emptyState.classList.add('hidden');
        clearHistoryBtn.classList.remove('hidden');
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            historyItems.push({ id: doc.id, ...data }); 
            html += createHistoryItemHTML(doc.id, data);
        });
        
        historyListContainer.innerHTML = html;
        observeImages(historyListContainer);
        
        setupSearchSystem(historyItems); 
        attachDeleteListeners();
    });
}

function createHistoryItemHTML(docId, data) {
    const title = data.showTitle || 'ไม่ระบุชื่อเรื่อง';
    const epTitle = data.lastWatchedEpisodeTitle || `ตอนที่ ${data.latestEpisodeNumber || '?'}`;
    const thumb = data.showThumbnail || 'https://placehold.co/160x90/333/fff?text=No+Img';
    const time = formatDateTime(data.watchedAt);
    const link = `player.html?id=${data.showId}&ep_id=${data.lastWatchedEpisodeId}`;
    const transparentPixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    return `
        <div class="history-item flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-gray-900 border border-gray-800 relative group">
            <a href="${link}" class="block w-full sm:w-48 flex-shrink-0 relative">
                <div class="history-thumb-wrapper image-wrapper animate-pulse">
                    <img src="${transparentPixel}" 
                         data-src="${thumb}" 
                         alt="${title}" 
                         class="history-thumb opacity-0">
                </div>
                <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md pointer-events-none">
                    <i class="ri-play-circle-fill text-4xl text-green-500"></i>
                </div>
            </a>
            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <a href="${link}" class="hover:text-green-500 transition-colors">
                    <h3 class="text-lg font-bold text-white truncate mb-1">${title}</h3>
                </a>
                <p class="text-green-400 text-sm font-medium mb-2">${epTitle}</p>
                <p class="text-gray-500 text-xs flex items-center">
                    <i class="ri-time-line mr-1"></i> รับชมล่าสุด: ${time}
                </p>
            </div>
            <div class="absolute top-2 right-2 sm:static sm:self-center">
                <button class="delete-btn text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-500/10 transition-colors" data-id="${docId}" title="ลบรายการนี้">
                    <i class="ri-delete-bin-line text-xl"></i>
                </button>
            </div>
        </div>
    `;
}

function attachDeleteListeners() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const docId = e.currentTarget.dataset.id;
            if (confirm('ลบประวัตินี้?')) {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/viewHistory`, docId));
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadNavbar('..');

    historyListContainer = document.getElementById('history-list');
    loadingState = document.getElementById('loading-state');
    emptyState = document.getElementById('empty-state');
    loginRequiredState = document.getElementById('login-required-state');
    clearHistoryBtn = document.getElementById('clear-history-btn');
    
    const btnLogin = document.getElementById('btn-login-page');
    if(btnLogin) btnLogin.onclick = () => window.triggerLogin();
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', async () => {
            if (confirm('ลบประวัติทั้งหมด?')) {
                const promises = historyItems.map(item => deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/viewHistory`, item.id)));
                await Promise.all(promises);
            }
        });
    }

    initializeFirebase();
});
