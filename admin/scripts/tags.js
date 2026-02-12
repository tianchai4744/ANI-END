// admin/scripts/tags.js
import { 
    doc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp 
} from "firebase/firestore";
import { getCollectionRef, showToast, showConfirmModal } from "./utils.js";

// --- 🧠 SERVICE LAYER (Business Logic) ---
const TagService = {
    unsubscribe: null,

    // 1. Subscribe Realtime
    subscribe(onUpdate) {
        if (this.unsubscribe) this.unsubscribe();

        const q = query(getCollectionRef("tags"), orderBy("name", "asc"));
        this.unsubscribe = onSnapshot(q, (snap) => {
            const tags = snap.docs.map(d => ({id: d.id, ...d.data()}));
            onUpdate(tags);
        }, (error) => {
            console.error("Tags Error:", error);
            showToast("โหลดหมวดหมู่ไม่สำเร็จ", "error");
        });
    },

    // 2. Add / Update
    async save(id, data) {
        // Validate
        if (!data.name || !data.slug) throw new Error("ข้อมูลไม่ครบถ้วน");

        if(id) {
            await updateDoc(doc(getCollectionRef("tags"), id), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef("tags"), data);
        }
    },

    // 3. Delete
    async delete(id) {
        await deleteDoc(doc(getCollectionRef("tags"), id));
    }
};

// --- 🎨 UI LAYER (View) ---
const TagUI = {
    renderTable(tags, onEdit, onDelete) {
        const tbody = document.getElementById('tag-table-body');
        if(!tbody) return;
        tbody.innerHTML = '';

        if (tags.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">ไม่มีหมวดหมู่</td></tr>';
            return;
        }

        tags.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-gray-700 hover:bg-gray-800 transition-colors";
            tr.innerHTML = `
                <td class="px-6 py-4 text-white">${t.name}</td>
                <td class="px-6 py-4 text-gray-400 font-mono">${t.slug}</td>
                <td class="px-6 py-4 text-right space-x-2">
                    <button class="btn-edit text-gray-400 hover:text-white" data-id="${t.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-del text-red-400 hover:text-red-300" data-id="${t.id}"><i class="fas fa-trash"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });

        // Bind Events
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            const t = tags.find(x => x.id === btn.dataset.id);
            if(t) btn.onclick = () => onEdit(t);
        });
        tbody.querySelectorAll('.btn-del').forEach(btn => {
            btn.onclick = () => onDelete(btn.dataset.id);
        });
    },

    renderCheckboxes(tags) {
        const container = document.getElementById('tags-checkbox-container');
        if(!container) return;
        container.innerHTML = '';
        tags.forEach(t => {
            const div = document.createElement('div');
            div.className = 'flex items-center space-x-2 p-2 hover:bg-gray-800 rounded';
            div.innerHTML = `
                <input type="checkbox" id="tag-${t.id}" value="${t.name}" class="show-tag-option form-checkbox h-4 w-4 text-indigo-500 bg-gray-900 border-gray-600 rounded">
                <label for="tag-${t.id}" class="text-sm text-gray-300 cursor-pointer select-none">${t.name}</label>
            `;
            container.appendChild(div);
        });
    },

    openModal(tag = null) {
        const form = document.getElementById('tag-form');
        form.reset();
        form.dataset.id = tag ? tag.id : '';
        
        if (tag) {
            document.getElementById('tag-name').value = tag.name;
            document.getElementById('tag-slug').value = tag.slug;
            document.getElementById('tag-modal-title').innerText = 'แก้ไขหมวดหมู่';
        } else {
            document.getElementById('tag-modal-title').innerText = 'เพิ่มหมวดหมู่';
        }

        document.getElementById('tag-modal').classList.remove('hidden');
        document.getElementById('tag-modal').classList.add('flex');
    },

    closeModal() {
        document.getElementById('tag-modal').classList.add('hidden'); 
        document.getElementById('tag-modal').classList.remove('flex');
    }
};

// --- 🎮 CONTROLLER ---
export function initTagModule() {
    TagService.subscribe((tags) => {
        TagUI.renderTable(tags, (tag) => TagUI.openModal(tag), (id) => handleDelete(id));
        TagUI.renderCheckboxes(tags);
    });

    document.getElementById('tag-form')?.addEventListener('submit', async(e) => {
        e.preventDefault();
        const id = e.target.dataset.id;
        const data = { 
            name: document.getElementById('tag-name').value.trim(), 
            slug: document.getElementById('tag-slug').value.trim() 
        };

        try {
            await TagService.save(id, data);
            showToast(id ? 'แก้ไขหมวดหมู่เรียบร้อย' : 'เพิ่มหมวดหมู่เรียบร้อย');
            TagUI.closeModal();
        } catch(err) { showToast(err.message, 'error'); }
    });
    
    window.openTagModal = () => TagUI.openModal();

    // ✅ FIXED: ประกาศฟังก์ชันปิด Modal ให้เป็น Global
    window.closeTagModal = () => TagUI.closeModal();
}

function handleDelete(id) {
    showConfirmModal('ลบหมวดหมู่', 'ยืนยัน?', async() => {
        try {
            await TagService.delete(id);
            showToast('ลบเรียบร้อย');
        } catch(e) { showToast(e.message, 'error'); }
    });
}
