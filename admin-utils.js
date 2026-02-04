import { collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, appId } from "./firebase-config.js";

// Helper: ดึง Ref ของ Collection
export function getCollectionRef(collectionName) {
    return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
}

// Helper: แสดงแจ้งเตือน Toast
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const colors = type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    
    toast.className = `${colors} text-white border-l-4 px-6 py-4 rounded shadow-2xl flex items-center gap-4 toast-enter min-w-[320px] pointer-events-auto backdrop-blur-md mb-3`;
    toast.innerHTML = `<i class="fas ${icon} text-2xl"></i><div><span class="font-bold block">${type === 'success' ? 'สำเร็จ' : 'ผิดพลาด'}</span><span class="text-sm">${message}</span></div>`;
    
    container.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 400); 
    }, 4000);
}

// Helper: Loading Overlay (แก้ไข: รองรับการเปลี่ยนข้อความ)
export function toggleLoading(show, text = "กำลังประมวลผล...") {
    const overlay = document.getElementById('loading-overlay');
    const txtElement = document.getElementById('loading-text'); // หา Element ข้อความ
    
    if (txtElement) txtElement.textContent = text; // อัปเดตข้อความ

    if(overlay) {
        if (show) { overlay.classList.remove('hidden'); overlay.classList.add('flex'); } 
        else { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
    }
}

// Helper: Confirm Modal
export function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const btnConfirm = document.getElementById('btn-confirm-ok');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    
    // Clone เพื่อล้าง Event Listener เก่า
    const newConfirm = btnConfirm.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    modal.classList.remove('hidden'); modal.classList.add('flex');

    newConfirm.addEventListener('click', () => {
        modal.classList.add('hidden'); modal.classList.remove('flex');
        onConfirm();
    });
    newCancel.addEventListener('click', () => {
        modal.classList.add('hidden'); modal.classList.remove('flex');
    });
}

// Helper: Parse Video URL (รองรับ YouTube/Dailymotion/Iframe)
export function parseVideoUrl(input) {
    if (!input) return "";
    const trimmed = input.trim();
    if (trimmed.startsWith("<iframe")) return trimmed;
    
    // YouTube
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = trimmed.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
        return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`;
    }
    
    // Dailymotion
    const dmRegex = /dailymotion\.com\/video\/([a-zA-Z0-9]+)/i;
    const dmMatch = trimmed.match(dmRegex);
    if (dmMatch && dmMatch[1]) {
        return `<iframe src="https://www.dailymotion.com/embed/video/${dmMatch[1]}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`;
    }
    
    return trimmed;
}
