// admin/scripts/banners.js
import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc,
    query, orderBy, getDocs, serverTimestamp 
} from "firebase/firestore";
import { getCollectionRef, showToast, toggleLoading, showConfirmModal } from "./utils.js";

const BannerService = {
    async fetchAll() {
        const q = query(getCollectionRef("banners"), orderBy("order", "asc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({id: d.id, ...d.data()}));
    },
    async save(id, data) {
        data.updatedAt = serverTimestamp();
        if(id) await updateDoc(doc(getCollectionRef("banners"), id), data);
        else {
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef("banners"), data);
        }
    },
    async delete(id) {
        await deleteDoc(doc(getCollectionRef("banners"), id));
    }
};

const BannerUI = {
    renderList(data, onAction) {
        const list = document.getElementById('banner-list');
        if(!list) return;
        list.innerHTML = '';
        
        data.forEach(b => {
            const div = document.createElement('div');
            div.className = "flex items-center gap-4 bg-gray-800 p-3 rounded-lg border border-gray-700";
            div.innerHTML = `
                <div class="font-bold text-xl text-gray-500">#${b.order}</div>
                <img src="${b.imageUrl}" class="w-32 h-16 object-cover rounded bg-black">
                <div class="flex-1">
                    <h4 class="text-white font-bold">${b.title || 'No Title'}</h4>
                    <a href="${b.linkUrl}" target="_blank" class="text-xs text-indigo-400 hover:underline truncate block max-w-md">${b.linkUrl}</a>
                </div>
                <div class="flex gap-2">
                    <button class="p-2 text-gray-400 hover:text-white btn-edit" data-id="${b.id}"><i class="fas fa-edit"></i></button>
                    <button class="p-2 text-red-400 hover:text-red-300 btn-del" data-id="${b.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            list.appendChild(div);
        });

        list.querySelectorAll('.btn-edit').forEach(b => b.onclick = () => onAction('edit', b.dataset.id));
        list.querySelectorAll('.btn-del').forEach(b => b.onclick = () => onAction('delete', b.dataset.id));
    },
    
    openModal(banner = null) {
        const modal = document.getElementById('banner-modal');
        const form = document.getElementById('banner-form');
        form.reset();
        form.dataset.id = banner ? banner.id : '';
        
        if(banner) {
            document.getElementById('banner-title').value = banner.title;
            document.getElementById('banner-image').value = banner.imageUrl;
            document.getElementById('banner-link').value = banner.linkUrl;
            document.getElementById('banner-order').value = banner.order;
        }
        modal.classList.remove('hidden'); modal.classList.add('flex');
    },
    closeModal() {
        document.getElementById('banner-modal').classList.add('hidden');
        document.getElementById('banner-modal').classList.remove('flex');
    }
};

export function initBannerModule() {
    const btnAdd = document.getElementById('btn-add-banner');
    if(btnAdd) {
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.onclick = () => BannerUI.openModal();
    }

    const form = document.getElementById('banner-form');
    if(form) form.onsubmit = handleFormSubmit;

    loadBanners();
}

async function loadBanners() {
    toggleLoading(true, "โหลดป้าย...");
    try {
        const items = await BannerService.fetchAll();
        BannerUI.renderList(items, async (action, id) => {
            if(action === 'edit') {
                const docSnap = await getDoc(doc(getCollectionRef("banners"), id));
                if(docSnap.exists()) BannerUI.openModal({id: docSnap.id, ...docSnap.data()});
            }
            if(action === 'delete') {
                showConfirmModal("ลบป้าย", "ยืนยัน?", async () => {
                    await BannerService.delete(id);
                    loadBanners();
                });
            }
        });
    } catch(e) { console.error(e); } 
    finally { toggleLoading(false); }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if(btn && btn.disabled) return;

    toggleLoading(true);
    if(btn) btn.disabled = true;

    try {
        const id = e.target.dataset.id;
        const data = {
            title: document.getElementById('banner-title').value.trim(),
            imageUrl: document.getElementById('banner-image').value.trim(),
            linkUrl: document.getElementById('banner-link').value.trim(),
            order: parseInt(document.getElementById('banner-order').value) || 0
        };
        await BannerService.save(id, data);
        showToast("บันทึกสำเร็จ");
        BannerUI.closeModal();
        loadBanners();
    } catch(e) { showToast(e.message, 'error'); }
    finally { toggleLoading(false); if(btn) btn.disabled = false; }
}
