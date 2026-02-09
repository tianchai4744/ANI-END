// js/pages/profile.js
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth, appId } from "../config/db-config.js";
import { loadNavbar } from "../modules/navbar.js";

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadNavbar('..');
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('profile-content').classList.remove('hidden');
            document.getElementById('loading-state').classList.add('hidden');
            
            // Load Data
            document.getElementById('input-name').value = user.displayName || '';
            document.getElementById('input-photo').value = user.photoURL || '';
            document.getElementById('preview-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email.charAt(0)}`;
            document.getElementById('user-email-display').textContent = user.email;
        } else {
            window.location.href = '/index.html'; 
        }
    });

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> กำลังบันทึก...';
        btn.disabled = true;

        try {
            const newName = document.getElementById('input-name').value.trim();
            const newPhoto = document.getElementById('input-photo').value.trim();

            if (!newName) throw new Error("กรุณากรอกชื่อ");

            await updateProfile(currentUser, {
                displayName: newName,
                photoURL: newPhoto || null
            });

            const userRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}`);
            await updateDoc(userRef, {
                displayName: newName,
                photoURL: newPhoto || null
            });

            window.showToast("บันทึกข้อมูลเรียบร้อย", "success");
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error(error);
            window.showToast("เกิดข้อผิดพลาด: " + error.message, "error");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
    
    document.getElementById('input-photo').addEventListener('input', (e) => {
        const url = e.target.value;
        if(url) document.getElementById('preview-avatar').src = url;
    });
});
