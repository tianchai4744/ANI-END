// admin/scripts/utils.js
import { collection } from "firebase/firestore";
import { db } from "../../js/config/db-config.js";

// ✅ ฟังก์ชันดึง Reference ของ Collection (กันเหนียว)
export function getCollectionRef(colName) {
    return collection(db, colName);
}

// ✅ ฟังก์ชันแสดง Toast แจ้งเตือน
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; // ถ้าหาไม่เจอให้จบเลย กัน Error

    const toast = document.createElement('div');
    // จัดสีตามประเภท (เขียว/แดง)
    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-emerald-600';
    
    toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0`;
    toast.innerHTML = `
        <i class="${type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'}"></i>
        <span class="font-medium">${message}</span>
    `;

    container.appendChild(toast);

    // Animation ขาเข้า
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    // ลบออกเมื่อเวลาผ่านไป
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-10');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ✅ ฟังก์ชันจัดการหน้าจอ Loading (จุดที่ Error บ่อย)
export function toggleLoading(show, text = "กำลังโหลด...") {
    const el = document.getElementById('global-loading');
    const txtEl = document.getElementById('loading-text');

    // ถ้ามี Element Loading ให้จัดการซ่อน/แสดง
    if (el) {
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    }

    // ✅ FIXED: เช็คก่อนเสมอว่า txtEl มีจริงไหม ก่อนจะสั่งแก้ข้อความ
    if (show && txtEl && text) {
        txtEl.textContent = text;
    }
}

// ✅ ฟังก์ชัน Modal ยืนยัน
export function showConfirmModal(title, message, onConfirm) {
    // สร้าง Modal HTML ขึ้นมาสดๆ เพื่อลดปัญหา Element หาย
    const modalId = 'dynamic-confirm-modal';
    let modal = document.getElementById(modalId);
    
    if (modal) modal.remove(); // ลบตัวเก่าทิ้งก่อน

    const html = `
    <div id="${modalId}" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
        <div class="bg-[#1e293b] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-700 p-6 transform scale-95 animate-scale-up">
            <h3 class="text-xl font-bold text-white mb-2">${title}</h3>
            <p class="text-gray-400 mb-6 text-sm">${message}</p>
            <div class="flex justify-end gap-3">
                <button id="btn-cancel-modal" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">ยกเลิก</button>
                <button id="btn-confirm-modal" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-lg transition-colors">ยืนยัน</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // ผูก Event
    document.getElementById('btn-cancel-modal').onclick = () => document.getElementById(modalId).remove();
    document.getElementById('btn-confirm-modal').onclick = async () => {
        document.getElementById(modalId).remove();
        if (onConfirm) await onConfirm();
    };
}
