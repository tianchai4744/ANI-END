import { collection, query, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, appId } from "../config/db-config.js";

export function initRandomButton() {
    const btnDesktop = document.getElementById('btn-random-anime');
    const btnMobile = document.getElementById('btn-random-anime-mobile');

    const handleRandom = async () => {
        try {
             // ดึงข้อมูล 20 เรื่องแรกมาสุ่ม
             const q = query(collection(db, `artifacts/${appId}/public/data/shows`), limit(20));
             const snap = await getDocs(q);
             
             if(!snap.empty) {
                const rIdx = Math.floor(Math.random() * snap.docs.length);
                const showId = snap.docs[rIdx].id;
                
                // ตรวจสอบ path เพื่อสร้างลิงก์ให้ถูกไม่ว่าจะอยู่หน้าไหน
                const currentPath = window.location.pathname;
                const prefix = currentPath.includes('/pages/') ? '' : 'pages/';
                
                window.location.href = `${prefix}player.html?id=${showId}`;
             } else { 
                 if(window.showToast) window.showToast("ไม่พบข้อมูลอนิเมะ", "error");
             }
        } catch(e) { 
            console.error(e);
            if(window.showToast) window.showToast("เกิดข้อผิดพลาดในการสุ่ม", "error");
        }
    };

    if(btnDesktop) btnDesktop.onclick = handleRandom;
    if(btnMobile) btnMobile.onclick = handleRandom;
}
