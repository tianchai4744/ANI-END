// js/pages/bookmarks.js
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, collection, query, orderBy, getDocs, doc, deleteDoc, setLogLevel } from "firebase/firestore";
import { db, auth, appId } from "../config/db-config.js";
import { createAnimeCard } from "../modules/card.js";
import { setupSearchSystem } from "../modules/search.js";
import { loadNavbar } from "../modules/navbar.js";
import { observeImages } from "../utils/tools.js";

let userId;
let historyItems = [];

async function initializeFirebase() {
    setLogLevel('silent');
    onAuthStateChanged(auth, async (user) => {
        const loading = document.getElementById('loading-state');
        const loginState = document.getElementById('login-required-state');
        const empty = document.getElementById('empty-state');
        const container = document.getElementById('bookmarks-grid');

        if (user) {
            userId = user.uid;
            loginState.classList.add('hidden');
            
            await setupSearchSystemFromHistory();
            setupBookmarksListener();
        } else {
            loading.classList.add('hidden');
            loginState.classList.remove('hidden');
            empty.classList.add('hidden');
            container.innerHTML = '';
            
            setupSearchSystem([]); 
        }
    });
}

async function setupSearchSystemFromHistory() {
    try {
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/viewHistory`));
        const snap = await getDocs(q);
        historyItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setupSearchSystem(historyItems);
    } catch (e) { console.error("Search init error", e); }
}

function setupBookmarksListener() {
    const container = document.getElementById('bookmarks-grid');
    const loading = document.getElementById('loading-state');
    const empty = document.getElementById('empty-state');

    const q = query(collection(db, `artifacts/${appId}/users/${userId}/bookmarks`), orderBy("savedAt", "desc"));

    onSnapshot(q, (snapshot) => {
        loading.classList.add('hidden');
        container.innerHTML = '';

        if (snapshot.empty) {
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const historyItem = historyItems.find(h => h.showId === doc.id);

            html += `
                <div class="relative group">
                    ${createAnimeCard({ id: doc.id, ...data }, null, historyItem)}
                    <button class="btn-remove-bookmark absolute top-2 right-2 z-20 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110" data-id="${doc.id}" title="ลบจากรายการโปรด">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
        observeImages(container);
        
        document.querySelectorAll('.btn-remove-bookmark').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if(confirm('ลบเรื่องนี้จากรายการโปรด?')) {
                    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/bookmarks`, btn.dataset.id));
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadNavbar('..');
    initializeFirebase();
    
    const btnLogin = document.getElementById('btn-login-page');
    if(btnLogin) btnLogin.onclick = () => window.triggerLogin();
});
