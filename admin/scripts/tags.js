// admin/scripts/tags.js
import { 
    doc, getDoc, addDoc, updateDoc, deleteDoc,
    query, orderBy, getDocs, serverTimestamp 
} from "firebase/firestore";
import { getCollectionRef, showToast, toggleLoading, showConfirmModal } from "./utils.js";

export function initTagModule() {
    const form = document.getElementById('tag-form');
    if(form) form.onsubmit = handleTagSubmit;
    loadTags();
}

async function loadTags() {
    const list = document.getElementById('tag-list');
    if(!list) return;
    
    try {
        const q = query(getCollectionRef("tags"), orderBy("name"));
        const snap = await getDocs(q);
        list.innerHTML = '';
        
        snap.forEach(d => {
            const t = d.data();
            const span = document.createElement('span');
            span.className = "bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm flex items-center gap-2";
            span.innerHTML = `
                ${t.name}
                <button class="text-red-400 hover:text-white" onclick="deleteTag('${d.id}')">&times;</button>
            `;
            list.appendChild(span);
        });
        
        // Expose global function for onclick
        window.deleteTag = (id) => {
             showConfirmModal("ลบหมวดหมู่", "ยืนยัน?", async () => {
                await deleteDoc(doc(getCollectionRef("tags"), id));
                loadTags();
            });
        };
    } catch(e) { console.error(e); }
}

async function handleTagSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('tag-name');
    const name = input.value.trim();
    if(!name) return;
    
    toggleLoading(true);
    try {
        await addDoc(getCollectionRef("tags"), {
            name,
            createdAt: serverTimestamp()
        });
        input.value = '';
        loadTags();
    } catch(e) { showToast(e.message, 'error'); }
    finally { toggleLoading(false); }
}
