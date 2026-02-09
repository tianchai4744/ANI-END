// js/modules/random-service.js
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

// 🧠 SERVICE
const RandomService = {
    async getRandomShowId() {
        const q = query(collection(db, `artifacts/${appId}/public/data/shows`), limit(20));
        const snap = await getDocs(q);
        
        if (snap.empty) return null;
        
        const rIdx = Math.floor(Math.random() * snap.docs.length);
        return snap.docs[rIdx].id;
    }
};

// 🎮 CONTROLLER
export function initRandomButton() {
    const btnDesktop = document.getElementById('btn-random-anime');
    const btnMobile = document.getElementById('btn-random-anime-mobile');

    const handleRandom = async (e) => {
        if(e) e.preventDefault();
        try {
             const showId = await RandomService.getRandomShowId();
             
             if(showId) {
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
