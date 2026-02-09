// admin/scripts/banners.js
import { doc, addDoc, deleteDoc, updateDoc, query, orderBy, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../js/config/db-config.js";
import { getCollectionRef, showConfirmModal, showToast } from "./utils.js";

// --- 🧠 SERVICE LAYER (Business Logic) ---
const BannerService = {
    unsubscribe: null,

    // 1. Subscribe to Realtime Updates
    subscribe(onUpdate) {
        // Unsubscribe old listener if exists
        if (this.unsubscribe) this.unsubscribe();

        const q = query(getCollectionRef("banners"), orderBy("order"));
        this.unsubscribe = onSnapshot(q, (snap) => {
            const banners = snap.docs.map(d => ({id: d.id, ...d.data()}));
            onUpdate(banners);
        }, (error) => {
            console.error("Banner Listener Error:", error);
            showToast("เชื่อมต่อข้อมูลล้มเหลว", "error");
        });
    },

    // 2. Add / Update
    async save(id, data) {
        data.updatedAt = serverTimestamp();
        
        // Auto-detect showId logic
        if (data.linkUrl && data.linkUrl.includes('id=')) {
             try {
                 const urlParams = new URLSearchParams(data.linkUrl.split('?')[1]);
                 const sId = urlParams.get('id');
                 if(sId) data.showId = sId;
             } catch(e){}
        }

        if(id) {
            await updateDoc(doc(getCollectionRef("banners"), id), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef("banners"), data);
        }
    },

    // 3. Delete
    async delete(id) {
        await deleteDoc(doc(getCollectionRef("banners"), id));
    },

    // 4. Reorder (Batch Update)
    async reorder(orderedIds) {
        const batch = writeBatch(db);
        orderedIds.forEach((id, idx) => {
            batch.update(doc(getCollectionRef("banners"), id), { order: idx + 1 });
        });
        await batch.commit();
    }
};

// --- 🎨 UI LAYER (View) ---
const BannerUI = {
    tbody: null,
    drake: null,
    currentBanners: [], // Store locally for Edit modal finding

    init(onReorder) {
        this.tbody = document.getElementById('banner-table-body');
        
        // Init Dragula
        if (typeof window.dragula !== 'undefined' && this.tbody) {
            if (!this.drake) {
                this.drake = window.dragula([this.tbody]);
                this.drake.on('drop', () => {
                    const orderedIds = Array.from(this.tbody.children).map(row => row.dataset.id);
                    onReorder(orderedIds);
                });
            } else {
                this.drake.containers = [this.tbody];
            }
        }
    },

    renderTable(banners, onEdit, onDelete) {
        if (!this.tbody) return;
        this.currentBanners = banners;
        this.tbody.innerHTML = '';

        banners.forEach(b => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-700 hover:bg-gray-800 transition-colors cursor-move"; 
            tr.dataset.id = b.id; 
            tr.innerHTML = `
                <td class="px-6 py-4"><img src="${b.imageUrl}" class="h-10 rounded object-cover bg-gray-700" onerror="this.src='https://placehold.co/100x40?text=No+Img'"></td>
                <td class="px-6 py-4 text-white">${b.title} ${b.isActive ? '<span class="text-emerald-400 text-xs ml-1">(Active)</span>':''}</td>
                <td class="px-6 py-4 text-gray-300">${b.order}</td>
                <td class="px-6 py-4 text-right">
                    <button class="btn-edit text-gray-400 hover:text-white mr-2" data-id="${b.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-del text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 p-2 rounded transition-colors" data-id="${b.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            this.tbody.appendChild(tr);
        });

        // Bind Events
        this.tbody.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = () => onEdit(btn.dataset.id));
        this.tbody.querySelectorAll('.btn-del').forEach(btn => btn.onclick = () => onDelete(btn.dataset.id));
    },

    openModal(id = null) {
        const form = document.getElementById('banner-form');
        form.reset();
        form.dataset.id = id || '';
        
        if (id) {
            const b = this.currentBanners.find(x => x.id === id);
            if (b) {
                document.getElementById('banner-title').value = b.title;
                document.getElementById('banner-image-url').value = b.imageUrl;
                document.getElementById('banner-link-url').value = b.linkUrl || '';
                document.getElementById('banner-order').value = b.order;
                document.getElementById('banner-active').checked = b.isActive;
            }
        } else {
            document.getElementById('banner-order').value = this.currentBanners.length + 1;
        }

        document.getElementById('banner-modal').classList.remove('hidden');
        document.getElementById('banner-modal').classList.add('flex');
    },

    closeModal() {
        document.getElementById('banner-modal').classList.add('hidden');
        document.getElementById('banner-modal').classList.remove('flex');
    }
};

// --- 🎮 CONTROLLER ---
export function initBannerModule() {
    // 1. Setup UI & Drag Listener
    BannerUI.init(async (orderedIds) => {
        await BannerService.reorder(orderedIds);
        showToast('อัปเดตลำดับเรียบร้อย');
    });

    // 2. Subscribe to Data
    BannerService.subscribe((banners) => {
        BannerUI.renderTable(banners, 
            (id) => BannerUI.openModal(id), 
            (id) => handleDelete(id)
        );
    });

    // 3. Form Handling
    const form = document.getElementById('banner-form');
    if(form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', handleBannerSubmit);
    }
    
    // Global Access
    window.openBannerModal = (id) => BannerUI.openModal(id);
}

async function handleBannerSubmit(e) {
    e.preventDefault();
    const id = e.target.dataset.id; // Get ID from dataset
    
    const data = {
        title: document.getElementById('banner-title').value,
        imageUrl: document.getElementById('banner-image-url').value,
        linkUrl: document.getElementById('banner-link-url').value,
        order: parseInt(document.getElementById('banner-order').value) || 0,
        isActive: document.getElementById('banner-active').checked
    };

    try {
        await BannerService.save(id, data);
        showToast(id ? 'แก้ไขแบนเนอร์สำเร็จ' : 'เพิ่มแบนเนอร์สำเร็จ');
        BannerUI.closeModal();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function handleDelete(id) {
    showConfirmModal('ลบแบนเนอร์', 'ยืนยัน?', async() => {
        try {
            await BannerService.delete(id);
            showToast('ลบแบนเนอร์แล้ว');
        } catch(e) {
            showToast(e.message, 'error');
        }
    });
}
