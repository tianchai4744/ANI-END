import { doc, addDoc, deleteDoc, updateDoc, query, orderBy, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";

// ✅ แก้ไข Import
import { db } from "../../js/config/db-config.js";
import { getCollectionRef, showConfirmModal, showToast } from "./utils.js";

let drake = null;
let banners = []; 
let currentEditingBannerId = null;

export function initBannerModule() {
    const tbody = document.getElementById('banner-table-body');
    const form = document.getElementById('banner-form');

    // 1. Init Dragula (Drag & Drop)
    if (typeof window.dragula !== 'undefined' && tbody) {
        if (!drake) {
            drake = window.dragula([tbody]);
            drake.on('drop', async () => {
                const batch = writeBatch(db);
                Array.from(tbody.children).forEach((row, idx) => {
                    batch.update(doc(getCollectionRef("banners"), row.dataset.id), { order: idx + 1 });
                });
                await batch.commit();
                showToast('อัปเดตลำดับเรียบร้อย');
            });
        } else {
            drake.containers = [tbody];
        }
    }

    // 2. Realtime Listener
    onSnapshot(query(getCollectionRef("banners"), orderBy("order")), (snap) => {
        banners = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        tbody.innerHTML = '';
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
            tbody.appendChild(tr);
        });

        // Bind Events
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.onclick = () => openBannerModal(btn.dataset.id);
        });
        tbody.querySelectorAll('.btn-del').forEach(btn => {
            btn.onclick = () => deleteBanner(btn.dataset.id);
        });
    });

    // Form Handlers
    if(form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', handleBannerSubmit);
    }
    
    window.openBannerModal = openBannerModal;
}

async function handleBannerSubmit(e) {
    e.preventDefault();
    const data = {
        title: document.getElementById('banner-title').value,
        imageUrl: document.getElementById('banner-image-url').value,
        linkUrl: document.getElementById('banner-link-url').value,
        order: parseInt(document.getElementById('banner-order').value) || 0,
        isActive: document.getElementById('banner-active').checked,
        updatedAt: serverTimestamp()
    };
    
    // Auto-detect showId from link
    if (data.linkUrl && data.linkUrl.includes('id=')) {
         try {
             const urlParams = new URLSearchParams(data.linkUrl.split('?')[1]);
             const sId = urlParams.get('id');
             if(sId) data.showId = sId;
         } catch(e){}
    }

    try {
        if(currentEditingBannerId) {
            await updateDoc(doc(getCollectionRef("banners"), currentEditingBannerId), data);
            showToast('แก้ไขแบนเนอร์สำเร็จ');
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef("banners"), data);
            showToast('เพิ่มแบนเนอร์สำเร็จ');
        }
        document.getElementById('banner-modal').classList.add('hidden');
        document.getElementById('banner-modal').classList.remove('flex');
    } catch(e) {
        showToast(e.message, 'error');
    }
}

function openBannerModal(id = null) {
    currentEditingBannerId = id;
    const form = document.getElementById('banner-form');
    form.reset();
    
    if (id) {
        const b = banners.find(x => x.id === id);
        if (b) {
            document.getElementById('banner-title').value = b.title;
            document.getElementById('banner-image-url').value = b.imageUrl;
            document.getElementById('banner-link-url').value = b.linkUrl || '';
            document.getElementById('banner-order').value = b.order;
            document.getElementById('banner-active').checked = b.isActive;
        }
    } else {
        document.getElementById('banner-order').value = banners.length + 1;
    }

    document.getElementById('banner-modal').classList.remove('hidden');
    document.getElementById('banner-modal').classList.add('flex');
}

function deleteBanner(id) {
    showConfirmModal('ลบแบนเนอร์', 'ยืนยัน?', async() => {
        await deleteDoc(doc(getCollectionRef("banners"), id));
        showToast('ลบแบนเนอร์แล้ว');
    });
}
