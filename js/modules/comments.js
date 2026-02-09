// js/modules/comments.js
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, startAfter } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";
import { formatTimestamp } from "../utils/tools.js";

// --- 🧠 SERVICE LAYER (สมอง) ---
const CommentService = {
    showId: null,
    episodeId: null,
    episodeNum: null,
    lastCursor: null,
    activeTab: 'episode',

    init(showId, episodeId, episodeNum) {
        this.showId = showId;
        this.episodeId = episodeId;
        this.episodeNum = episodeNum;
        this.lastCursor = null;
        this.activeTab = 'episode';
    },

    setTab(tab) {
        if (this.activeTab !== tab) {
            this.activeTab = tab;
            this.lastCursor = null;
            return true; // บอกว่ามีการเปลี่ยนแปลง
        }
        return false;
    },

    async fetchComments(isReset = false) {
        const commentsRef = collection(db, `artifacts/${appId}/public/data/comments`);
        let baseQuery;

        if (this.activeTab === 'episode') {
            if (!this.episodeId) throw new Error("Missing Episode ID");
            baseQuery = query(commentsRef, where("episodeId", "==", this.episodeId), orderBy("createdAt", "desc"));
        } else {
            baseQuery = query(commentsRef, where("showId", "==", this.showId), where("type", "==", "show"), orderBy("createdAt", "desc"));
        }

        let finalQuery = query(baseQuery, limit(20));
        if (!isReset && this.lastCursor) {
            finalQuery = query(baseQuery, startAfter(this.lastCursor), limit(20));
        }

        const snapshot = await getDocs(finalQuery);
        
        // Update Cursor
        if (!snapshot.empty) {
            this.lastCursor = snapshot.docs[snapshot.docs.length - 1];
        } else if (isReset) {
            this.lastCursor = null;
        }

        return {
            items: snapshot.docs.map(doc => doc.data()),
            hasMore: snapshot.docs.length >= 20,
            isEmpty: isReset && snapshot.empty
        };
    },

    async post(user, text) {
        if (!user || !this.showId) throw new Error("Unauthorized or Missing ID");
        
        const payload = {
            userId: user.uid,
            userName: user.displayName || 'User',
            userPhoto: user.photoURL || '',
            text: text, 
            createdAt: serverTimestamp(),
            showId: this.showId,
            episodeId: this.episodeId || null,
            episodeNum: this.episodeNum || 0,
            type: this.activeTab 
        };

        await addDoc(collection(db, `artifacts/${appId}/public/data/comments`), payload);
        this.lastCursor = null; // Reset list after post
    }
};

// --- 🎨 UI LAYER (หน้าตา) ---
const CommentUI = {
    listContainer: null,
    btnMore: null,
    tabEpisode: null,
    tabShow: null,
    isLoading: false,

    init() {
        this.listContainer = document.getElementById('comments-list');
        this.btnMore = document.getElementById('btn-load-more-comments');
        this.tabEpisode = document.getElementById('tab-comment-episode');
        this.tabShow = document.getElementById('tab-comment-show');
    },

    setupTabs(currentEpisodeNum, onTabChange) {
        if(!this.tabEpisode || !this.tabShow) return;

        const epLabel = currentEpisodeNum ? `ตอนที่ ${currentEpisodeNum}` : 'ตอนนี้';
        this.tabEpisode.innerHTML = `<i class="ri-movie-2-line mr-1"></i> พูดคุย${epLabel}`;
        this.tabShow.innerHTML = `<i class="ri-discuss-line mr-1"></i> พูดคุยทั้งเรื่อง`;

        this.tabEpisode.onclick = () => onTabChange('episode');
        this.tabShow.onclick = () => onTabChange('show');
    },

    updateTabState(activeTab) {
        if(!this.tabEpisode || !this.tabShow) return;
        const activeClass = "flex-1 py-3 text-sm font-bold text-green-400 border-b-2 border-green-500 bg-gray-800/80 transition-all cursor-default";
        const inactiveClass = "flex-1 py-3 text-sm font-medium text-gray-400 border-b border-gray-700 hover:text-white hover:bg-gray-800 transition-all cursor-pointer";

        if (activeTab === 'episode') {
            this.tabEpisode.className = activeClass;
            this.tabShow.className = inactiveClass;
        } else {
            this.tabShow.className = activeClass;
            this.tabEpisode.className = inactiveClass;
        }
    },

    renderLoading(isReset) {
        if (!this.listContainer) return;
        this.isLoading = true;
        
        if (isReset) {
            this.listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8 text-gray-500 animate-pulse">
                    <i class="ri-loader-4-line text-2xl animate-spin mb-2"></i>
                    <span class="text-xs">กำลังโหลดความคิดเห็น...</span>
                </div>`;
            if(this.btnMore) this.btnMore.classList.add('hidden');
        } else {
            if(this.btnMore) {
                this.btnMore.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> กำลังโหลด...';
                this.btnMore.disabled = true;
            }
        }
    },

    renderList(data, isReset, activeTab) {
        this.isLoading = false;
        if (!this.listContainer) return;

        if (isReset) this.listContainer.innerHTML = '';

        if (data.isEmpty) {
            const msg = activeTab === 'episode' ? 'ยังไม่มีใครคุยเกี่ยวกับตอนนี้เลย' : 'ยังไม่มีการพูดคุยในภาพรวม';
            this.listContainer.innerHTML = `
                <div class="text-center py-8">
                    <div class="bg-gray-800/50 inline-flex p-3 rounded-full mb-3 text-gray-500">
                        <i class="ri-chat-1-line text-2xl"></i>
                    </div>
                    <p class="text-gray-400 text-sm">${msg}</p>
                    <p class="text-gray-600 text-xs mt-1">มาเริ่มเปิดประเด็นกันเถอะ!</p>
                </div>`;
        } else {
            const fragment = document.createDocumentFragment();
            data.items.forEach(c => fragment.appendChild(this._createCommentElement(c, activeTab)));
            this.listContainer.appendChild(fragment);
        }

        // Manage Load More Button
        if (this.btnMore) {
            if (data.hasMore) {
                this.btnMore.classList.remove('hidden');
                this.btnMore.innerHTML = 'โหลดความคิดเห็นเพิ่มเติม...';
                this.btnMore.disabled = false;
            } else {
                this.btnMore.classList.add('hidden');
            }
        }
    },

    renderError(error, isReset) {
        this.isLoading = false;
        if (!this.listContainer) return;
        
        let msgHtml = `<p class="text-red-500 text-sm text-center py-4">เกิดข้อผิดพลาด: ${error.message}</p>`;

        if (error.message.includes("index")) {
            const indexLink = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            if (indexLink) {
                msgHtml = `
                    <div class="text-center p-4 border border-yellow-600 bg-yellow-900/30 rounded-lg my-4">
                        <i class="ri-alert-line text-2xl text-yellow-500 mb-2 block"></i>
                        <p class="text-yellow-500 text-sm mb-2 font-bold">⚠️ จำเป็นต้องสร้าง Index ใหม่</p>
                        <a href="${indexLink[0]}" target="_blank" class="inline-block bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors">คลิกสร้าง Index</a>
                    </div>`;
            }
        }

        if(isReset) this.listContainer.innerHTML = msgHtml;
        else this.listContainer.insertAdjacentHTML('beforeend', msgHtml);
        
        if(this.btnMore) this.btnMore.classList.add('hidden');
    },

    togglePostLoading(isLoading) {
        const btn = document.getElementById('btn-post-comment');
        if (!btn) return;

        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i>';
        } else {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.originalText || 'โพสต์';
        }
    },

    clearInput() {
        const input = document.getElementById('comment-input');
        if(input) input.value = '';
    },

    _createCommentElement(c, activeTab) {
        const div = document.createElement('div');
        div.className = "group flex gap-3 mb-4 border-b border-gray-800 pb-4 last:border-0 hover:bg-gray-800/30 p-2 rounded-lg transition-colors";

        const img = document.createElement('img');
        img.src = c.userPhoto || 'https://placehold.co/40x40?text=?';
        img.className = "w-10 h-10 rounded-full bg-gray-700 object-cover flex-shrink-0 shadow-sm";
        
        const contentDiv = document.createElement('div');
        contentDiv.className = "flex-1 min-w-0";

        const header = document.createElement('div');
        header.className = "flex items-center flex-wrap gap-y-1 mb-1";
        
        const nameSpan = document.createElement('span');
        nameSpan.className = "font-bold text-sm text-green-400 mr-2";
        nameSpan.textContent = c.userName || 'Guest';
        
        const dateSpan = document.createElement('span');
        dateSpan.className = "text-xs text-gray-500";
        dateSpan.textContent = c.createdAt ? formatTimestamp(c.createdAt) : 'เมื่อสักครู่';

        header.appendChild(nameSpan);
        header.appendChild(dateSpan);

        if (activeTab === 'show' && c.episodeNum) {
            const epBadge = document.createElement('span');
            epBadge.className = "bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded ml-2";
            epBadge.textContent = `Ep.${c.episodeNum}`;
            header.appendChild(epBadge);
        }

        const p = document.createElement('p');
        p.className = "text-sm text-gray-200 whitespace-pre-line leading-relaxed";
        p.textContent = c.text;

        contentDiv.appendChild(header);
        contentDiv.appendChild(p);
        
        div.appendChild(img);
        div.appendChild(contentDiv);
        return div;
    }
};

// --- 🎮 CONTROLLER (ตัวเชื่อม) ---

export function initCommentSystem(showId, episodeId, episodeNum) {
    CommentService.init(showId, episodeId, episodeNum);
    CommentUI.init();
    
    // Setup Tabs
    CommentUI.setupTabs(episodeNum, (selectedTab) => {
        if (CommentService.setTab(selectedTab)) {
            CommentUI.updateTabState(selectedTab);
            loadComments(true);
        }
    });

    // Initial Load
    CommentUI.updateTabState('episode');
    loadComments(true);

    // Setup Load More Button
    const btnMore = document.getElementById('btn-load-more-comments');
    if(btnMore) {
        const newBtn = btnMore.cloneNode(true);
        btnMore.parentNode.replaceChild(newBtn, btnMore);
        CommentUI.btnMore = newBtn; // ✅ Re-bind UI reference (สำคัญมาก)
        newBtn.onclick = () => loadComments(false);
    }
}

export async function loadComments(isReset = false) {
    if (CommentUI.isLoading) return;
    
    CommentUI.renderLoading(isReset);
    
    try {
        const result = await CommentService.fetchComments(isReset);
        CommentUI.renderList(result, isReset, CommentService.activeTab);
    } catch (e) {
        console.error("Load Comments Error", e);
        CommentUI.renderError(e, isReset);
    }
}

export async function postComment(user) {
    const input = document.getElementById('comment-input');
    const text = input ? input.value.trim() : '';
    
    if(!user || !text) return;
    
    CommentUI.togglePostLoading(true);
    
    try {
        await CommentService.post(user, text);
        CommentUI.clearInput();
        await loadComments(true);
    } catch(e) {
        console.error("Post Error", e);
        alert("ส่งความคิดเห็นไม่สำเร็จ: " + e.message);
    } finally {
        CommentUI.togglePostLoading(false);
    }
}

export function updateCommentUIState(user) {
    const loginPrompt = document.getElementById('comment-login-prompt');
    const inputArea = document.getElementById('comment-input-area');
    const userAvatar = document.getElementById('comment-user-avatar');
    
    if (!loginPrompt || !inputArea) return;

    if(user) {
        loginPrompt.classList.add('hidden');
        inputArea.classList.remove('hidden');
        if(userAvatar) userAvatar.src = user.photoURL || 'https://placehold.co/40x40';
    } else {
        loginPrompt.classList.remove('hidden');
        inputArea.classList.add('hidden');
    }
}
