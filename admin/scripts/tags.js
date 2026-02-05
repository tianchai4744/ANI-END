import { 
    doc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ✅ แก้ไข Import
import { getCollectionRef, showToast, showConfirmModal } from "./utils.js";

let currentEditingTagId = null;

export function initTagModule() {
    // 1. Realtime Listener สำหรับ Tags
    onSnapshot(query(getCollectionRef("tags"), orderBy("name", "asc")), (snap) => {
        const tags = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderTagTable(tags);
        renderTagCheckboxes(tags); // สร้าง Checkbox รอไว้สำหรับหน้าแก้ไขอนิเมะ
    });

    // 2. Handle Form Submit
    document.getElementById('tag-form')?.addEventListener('submit', async(e) => {
        e.preventDefault();
        try {
            const data = { 
                name: document.getElementById('tag-name').value.trim(), 
                slug: document.getElementById('tag-slug').value.trim() 
            };
            
            if(currentEditingTagId) {
                await updateDoc(doc(getCollectionRef("tags"), currentEditingTagId), data);
                showToast('แก้ไขหมวดหมู่เรียบร้อย');
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(getCollectionRef("tags"), data);
                showToast('เพิ่มหมวดหมู่เรียบร้อย');
            }
            
            document.getElementById('tag-modal').classList.add('hidden'); 
            document.getElementById('tag-modal').classList.remove('flex');
        } catch(e){ showToast(e.message, 'error'); }
    });
}

// Render ตารางจัดการหมวดหมู่
function renderTagTable(data) {
    const tbody = document.getElementById('tag-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    data.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-700 hover:bg-gray-800 transition-colors";
        tr.innerHTML = `
            <td class="px-6 py-4 text-white">${t.name}</td>
            <td class="px-6 py-4 text-gray-400 font-mono">${t.slug}</td>
            <td class="px-6 py-4 text-right space-x-2">
                <button class="btn-edit text-gray-400 hover:text-white" data-id="${t.id}" data-name="${t.name}" data-slug="${t.slug}"><i class="fas fa-edit"></i></button>
                <button class="btn-del text-red-400 hover:text-red-300" data-id="${t.id}"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => openTagModal(btn.dataset.id, btn.dataset.name, btn.dataset.slug);
    });
    tbody.querySelectorAll('.btn-del').forEach(btn => {
        btn.onclick = () => deleteTag(btn.dataset.id);
    });
}

// Render Checkbox สำหรับหน้า Show Modal (กู้คืนส่วนที่หายไปของ admin-shows.js)
function renderTagCheckboxes(tags) {
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
}

function openTagModal(id, name, slug) {
    currentEditingTagId = id;
    document.getElementById('tag-name').value = name;
    document.getElementById('tag-slug').value = slug;
    document.getElementById('tag-modal-title').innerText = 'แก้ไขหมวดหมู่';
    document.getElementById('tag-modal').classList.remove('hidden');
    document.getElementById('tag-modal').classList.add('flex');
}

function deleteTag(id) {
    showConfirmModal('ลบหมวดหมู่', 'ยืนยัน?', async() => deleteDoc(doc(getCollectionRef("tags"), id)));
}
