import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, startAfter } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";
import { formatTimestamp } from "../utils/tools.js";

// ตัวแปรเก็บสถานะปัจจุบัน
let activeTab = 'episode'; 
let currentShowId = null;
let currentEpisodeId = null;
let currentEpisodeNum = null;

// ตัวแปรสำหรับ Pagination
let lastCommentCursor = null; 
let isCommentsLoading = false;

// ฟังก์ชันสร้าง Element อย่างปลอดภัย (ป้องกัน XSS 100%)
function createCommentElement(c) {
    const div = document.createElement('div');
    div.className = "group flex gap-3 mb-4 border-b border-gray-800 pb-4 last:border-0 hover:bg-gray-800/30 p-2 rounded-lg transition-colors";

    // ส่วนรูปภาพ
    const img = document.createElement('img');
    img.src = c.userPhoto || 'https://placehold.co/40x40?text=?';
    img.className = "w-10 h-10 rounded-full bg-gray-700 object-cover flex-shrink-0 shadow-sm";
    
    // ส่วนเนื้อหา
    const contentDiv = document.createElement('div');
    contentDiv.className = "flex-1 min-w-0";

    // ส่วนหัว (ชื่อ + เวลา)
    const header = document.createElement('div');
    header.className = "flex items-center flex-wrap gap-y-1 mb-1";
    
    const nameSpan = document.createElement('span');
    nameSpan.className = "font-bold text-sm text-green-400 mr-2";
    nameSpan.textContent = c.userName || 'Guest'; // textContent ปลอดภัยเสมอ
    
    const dateSpan = document.createElement('span');
    dateSpan.className = "text-xs text-gray-500";
    dateSpan.textContent = c.createdAt ? formatTimestamp(c.createdAt) : 'เมื่อสักครู่';

    header.appendChild(nameSpan);
    header.appendChild(dateSpan);

    // Badge บอกตอน (กรณีดูรวมทั้งเรื่อง)
    if (activeTab === 'show' && c.episodeNum) {
        const epBadge = document.createElement('span');
        epBadge.className = "bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded ml-2";
        epBadge.textContent = `Ep.${c.episodeNum}`;
        header.appendChild(epBadge);
    }

    // ส่วนข้อความคอมเมนต์
    const p = document.createElement('p');
    p.className = "text-sm text-gray-200 whitespace-pre-line leading-relaxed";
    p.textContent = c.text; // textContent จะจัดการ escape html ให้เองอัตโนมัติ

    contentDiv.appendChild(header);
    contentDiv.appendChild(p);
    
    div.appendChild(img);
    div.appendChild(contentDiv);
    
    return div;
}

// ฟังก์ชันเริ่มต้นระบบ
export function initCommentSystem(showId, episodeId, episodeNum) {
    currentShowId = showId;
    currentEpisodeId = episodeId;
    currentEpisodeNum = episodeNum;
    
    activeTab = 'episode';
    lastCommentCursor = null;
    
    setupTabs();
    loadComments(true);

    const btnMore = document.getElementById('btn-load-more-comments');
    if(btnMore) {
        const newBtn = btnMore.cloneNode(true);
        btnMore.parentNode.replaceChild(newBtn, btnMore);
        newBtn.onclick = () => loadComments(false);
    }
}

function setupTabs() {
    const tabEpisode = document.getElementById('tab-comment-episode');
    const tabShow = document.getElementById('tab-comment-show');
    
    if(!tabEpisode || !tabShow) return;

    const epLabel = currentEpisodeNum ? `ตอนที่ ${currentEpisodeNum}` : 'ตอนนี้';
    tabEpisode.innerHTML = `<i class="ri-movie-2-line mr-1"></i> พูดคุย${epLabel}`;
    tabShow.innerHTML = `<i class="ri-discuss-line mr-1"></i> พูดคุยทั้งเรื่อง`;

    const updateTabUI = () => {
        if (activeTab === 'episode') {
            tabEpisode.className = "flex-1 py-3 text-sm font-bold text-green-400 border-b-2 border-green-500 bg-gray-800/80 transition-all cursor-default";
            tabShow.className = "flex-1 py-3 text-sm font-medium text-gray-400 border-b border-gray-700 hover:text-white hover:bg-gray-800 transition-all cursor-pointer";
        } else {
            tabShow.className = "flex-1 py-3 text-sm font-bold text-green-400 border-b-2 border-green-500 bg-gray-800/80 transition-all cursor-default";
            tabEpisode.className = "flex-1 py-3 text-sm font-medium text-gray-400 border-b border-gray-700 hover:text-white hover:bg-gray-800 transition-all cursor-pointer";
        }
    };

    tabEpisode.onclick = () => {
        if (activeTab !== 'episode') {
            activeTab = 'episode';
            lastCommentCursor = null;
            updateTabUI();
            loadComments(true);
        }
    };

    tabShow.onclick = () => {
        if (activeTab !== 'show') {
            activeTab = 'show';
            lastCommentCursor = null;
            updateTabUI();
            loadComments(true);
        }
    };

    updateTabUI();
}

// โหลดและแสดงรายการคอมเมนต์ (Refactored)
export async function loadComments(isReset = false) {
    const container = document.getElementById('comments-list');
    const btnMore = document.getElementById('btn-load-more-comments');
    if(!container) return;
    
    if (isCommentsLoading) return;
    isCommentsLoading = true;

    if (isReset) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-gray-500 animate-pulse">
                <i class="ri-loader-4-line text-2xl animate-spin mb-2"></i>
                <span class="text-xs">กำลังโหลดความคิดเห็น...</span>
            </div>`;
        if(btnMore) btnMore.classList.add('hidden');
    } else {
        if(btnMore) {
            btnMore.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> กำลังโหลด...';
            btnMore.disabled = true;
        }
    }
    
    try {
        const commentsRef = collection(db, `artifacts/${appId}/public/data/comments`);
        let baseQuery;

        if (activeTab === 'episode') {
            if (!currentEpisodeId) {
                container.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">ไม่พบข้อมูลตอน</p>`;
                isCommentsLoading = false; return;
            }
            baseQuery = query(
                commentsRef, 
                where("episodeId", "==", currentEpisodeId), 
                orderBy("createdAt", "desc")
            );
        } else {
            baseQuery = query(
                commentsRef, 
                where("showId", "==", currentShowId),
                where("type", "==", "show"), 
                orderBy("createdAt", "desc")
            );
        }

        let finalQuery = query(baseQuery, limit(20));
        
        if (!isReset && lastCommentCursor) {
            finalQuery = query(baseQuery, startAfter(lastCommentCursor), limit(20));
        }

        const snapshot = await getDocs(finalQuery);
        
        if(isReset && snapshot.empty) {
            const msg = activeTab === 'episode' ? 'ยังไม่มีใครคุยเกี่ยวกับตอนนี้เลย' : 'ยังไม่มีการพูดคุยในภาพรวม';
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="bg-gray-800/50 inline-flex p-3 rounded-full mb-3 text-gray-500">
                        <i class="ri-chat-1-line text-2xl"></i>
                    </div>
                    <p class="text-gray-400 text-sm">${msg}</p>
                    <p class="text-gray-600 text-xs mt-1">มาเริ่มเปิดประเด็นกันเถอะ!</p>
                </div>`;
            isCommentsLoading = false;
            return;
        }
        
        if(isReset) container.innerHTML = '';
        
        // ใช้ DocumentFragment เพื่อประสิทธิภาพสูงสุด (Render ทีเดียว)
        const fragment = document.createDocumentFragment();
        snapshot.forEach(doc => {
            fragment.appendChild(createCommentElement(doc.data()));
        });
        container.appendChild(fragment);

        if (snapshot.docs.length < 20) {
            lastCommentCursor = null;
            if(btnMore) btnMore.classList.add('hidden');
        } else {
            lastCommentCursor = snapshot.docs[snapshot.docs.length - 1];
            if(btnMore) {
                btnMore.classList.remove('hidden');
                btnMore.innerHTML = 'โหลดความคิดเห็นเพิ่มเติม...';
                btnMore.disabled = false;
            }
        }

    } catch(e) {
        console.error("Load comments error", e);
        if (e.message.includes("index")) {
            const indexLink = e.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            if (indexLink) {
                const msg = `
                    <div class="text-center p-4 border border-yellow-600 bg-yellow-900/30 rounded-lg my-4">
                        <i class="ri-alert-line text-2xl text-yellow-500 mb-2 block"></i>
                        <p class="text-yellow-500 text-sm mb-2 font-bold">⚠️ จำเป็นต้องสร้าง Index ใหม่</p>
                        <a href="${indexLink[0]}" target="_blank" class="inline-block bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors">คลิกสร้าง Index</a>
                    </div>`;
                if(isReset) container.innerHTML = msg;
                else container.insertAdjacentHTML('beforeend', msg);
                if(btnMore) btnMore.classList.add('hidden');
                return;
            }
        }
        if(isReset) container.innerHTML = `<p class="text-red-500 text-sm text-center py-4">เกิดข้อผิดพลาด: ${e.message}</p>`;
    } finally {
        isCommentsLoading = false;
    }
}

export async function postComment(user) {
    if(!user || !currentShowId) return;
    
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if(!text) return;
    
    const btn = document.getElementById('btn-post-comment');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i>';
    
    try {
        const commentData = {
            userId: user.uid,
            userName: user.displayName || 'User',
            userPhoto: user.photoURL || '',
            text: text, 
            createdAt: serverTimestamp(),
            showId: currentShowId,
            episodeId: currentEpisodeId || null,
            episodeNum: currentEpisodeNum || 0,
            type: activeTab 
        };

        await addDoc(collection(db, `artifacts/${appId}/public/data/comments`), commentData);
        
        input.value = '';
        lastCommentCursor = null; 
        await loadComments(true); 
        
    } catch(e) {
        console.error("Post comment error", e);
        alert("ส่งความคิดเห็นไม่สำเร็จ: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
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
