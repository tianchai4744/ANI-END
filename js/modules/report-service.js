import { collection, addDoc, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, appId } from "../config/db-config.js";

// รับ currentEpisode แบบ Function Getter เพื่อให้ได้ค่าล่าสุดเสมอ
export function initReportSystem(user, showData, getCurrentEpisode) {
    const btn = document.getElementById('report-broken-btn');
    if (!btn) return;

    btn.onclick = async () => {
        const currentEp = getCurrentEpisode();
        if (!user) { alert('กรุณาเข้าสู่ระบบก่อนแจ้งปัญหา'); window.triggerLogin(); return; }
        if (!currentEp) return;

        if(!confirm(`ยืนยันแจ้งไฟล์เสียสำหรับตอนที่ ${currentEp.number}?`)) return;

        btn.textContent = 'กำลังแจ้ง...';
        btn.disabled = true;

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/reports`), {
                episodeId: currentEp.id,
                showId: showData.id,
                reportedBy: 'user',
                userId: user.uid,
                reason: 'Broken Link',
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, `artifacts/${appId}/public/data/episodes`, currentEp.id), { 
                status: 'user_reported' 
            });
            
            // อัปเดต Object ปัจจุบันและ UI
            currentEp.status = 'user_reported';
            updateReportUI(currentEp);

        } catch(e) { 
            console.error(e); 
            btn.textContent = 'แจ้งล้มเหลว'; 
            btn.disabled = false;
        }
    };
}

export function updateReportUI(episode) {
    const btn = document.getElementById('report-broken-btn');
    const alertDiv = document.getElementById('broken-alert');
    if(!btn) return;

    const status = episode.status;
    if (status === 'broken' || status === 'user_reported') {
        btn.disabled = true;
        btn.innerHTML = status === 'broken' ? '<i class="ri-check-line"></i> แจ้งแล้ว (เสีย)' : '<i class="ri-check-line"></i> แจ้งแล้ว (รอตรวจสอบ)';
        btn.className = "flex items-center bg-red-600 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors opacity-50 cursor-not-allowed";
        if(alertDiv) alertDiv.classList.remove('hidden');
    } else { 
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-error-warning-line mr-1"></i> แจ้ง (เสีย)';
        btn.className = "flex items-center bg-gray-700 hover:bg-red-600 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors cursor-pointer";
        if(alertDiv) alertDiv.classList.add('hidden');
    }
}
