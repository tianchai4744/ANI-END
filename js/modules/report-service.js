// js/modules/report-service.js
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

// --- 🧠 SERVICE LAYER ---
const ReportService = {
    async submitReport(user, showId, episode) {
        // 1. Create Report Log
        await addDoc(collection(db, `artifacts/${appId}/public/data/reports`), {
            episodeId: episode.id,
            showId: showId,
            reportedBy: 'user',
            userId: user.uid,
            reason: 'Broken Link',
            createdAt: serverTimestamp()
        });

        // 2. Update Episode Status
        await updateDoc(doc(db, `artifacts/${appId}/public/data/episodes`, episode.id), { 
            status: 'user_reported' 
        });
        
        return true;
    }
};

// --- 🎨 UI LAYER ---
const ReportUI = {
    btn: null,
    alertDiv: null,

    init() {
        this.btn = document.getElementById('report-broken-btn');
        this.alertDiv = document.getElementById('broken-alert');
    },

    updateState(status) {
        if (!this.btn) return;

        if (status === 'broken' || status === 'user_reported') {
            this.btn.disabled = true;
            this.btn.innerHTML = status === 'broken' ? '<i class="ri-check-line"></i> แจ้งแล้ว (เสีย)' : '<i class="ri-check-line"></i> แจ้งแล้ว (รอตรวจสอบ)';
            this.btn.className = "flex items-center bg-red-600 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors opacity-50 cursor-not-allowed";
            if (this.alertDiv) this.alertDiv.classList.remove('hidden');
        } else { 
            this.btn.disabled = false;
            this.btn.innerHTML = '<i class="ri-error-warning-line mr-1"></i> แจ้ง (เสีย)';
            this.btn.className = "flex items-center bg-gray-700 hover:bg-red-600 text-white text-sm font-medium py-1.5 px-3 rounded-md transition-colors cursor-pointer";
            if (this.alertDiv) this.alertDiv.classList.add('hidden');
        }
    },

    setLoading(isLoading) {
        if (!this.btn) return;
        this.btn.disabled = isLoading;
        if (isLoading) this.btn.textContent = 'กำลังแจ้ง...';
    },

    confirmAction(epNumber) {
        return confirm(`ยืนยันแจ้งไฟล์เสียสำหรับตอนที่ ${epNumber}?`);
    }
};

// --- 🎮 CONTROLLER ---
export function initReportSystem(user, showData, getCurrentEpisode) {
    ReportUI.init();
    if (!ReportUI.btn) return;

    ReportUI.btn.onclick = async () => {
        const currentEp = getCurrentEpisode();
        if (!currentEp) return;

        if (!user) { 
            alert('กรุณาเข้าสู่ระบบก่อนแจ้งปัญหา'); 
            window.triggerLogin(); 
            return; 
        }

        if (!ReportUI.confirmAction(currentEp.number)) return;

        ReportUI.setLoading(true);

        try {
            await ReportService.submitReport(user, showData.id, currentEp);
            
            // Update Local State & UI
            currentEp.status = 'user_reported';
            ReportUI.updateState('user_reported');

        } catch(e) { 
            console.error(e); 
            alert('แจ้งปัญหาล้มเหลว: ' + e.message);
            ReportUI.updateState(currentEp.status); // Revert
        }
    };
}

export function updateReportUI(episode) {
    ReportUI.init(); // Re-select elements just in case
    ReportUI.updateState(episode.status);
}
