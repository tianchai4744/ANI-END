import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/db-config.js";

export async function initHistorySection() {
    const historyList = document.getElementById('history-list');
    const historySection = document.getElementById('history-section');
    
    // ถ้าไม่มี Element ในหน้า Index ให้หยุดทำงาน (ป้องกัน Error ในหน้าอื่น)
    if (!historyList || !historySection) return;

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            historySection.classList.add('hidden');
            return;
        }

        try {
            // ดึงข้อมูลประวัติการดู 10 รายการล่าสุด
            const historyRef = collection(db, `artifacts/${appId}/users/${user.uid}/viewHistory`);
            const q = query(historyRef, orderBy("watchedAt", "desc"), limit(10));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                historySection.classList.add('hidden');
                return;
            }

            historySection.classList.remove('hidden');
            
            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // ✅ ปรับปรุง UI:
                // 1. ใช้ aspect-[2/3] ล็อกสัดส่วนรูปภาพ
                // 2. ใช้ object-cover เพื่อให้ภาพเต็มกรอบเสมอ
                // 3. เพิ่ม Overlay ไล่เฉดสีเพื่อให้ตัวหนังสืออ่านง่าย
                html += `
                    <div class="flex-shrink-0 w-32 sm:w-40 snap-start transition-transform hover:-translate-y-1 duration-300">
                        <a href="pages/player.html?id=${data.showId}&ep_id=${data.lastWatchedEpisodeId}" 
                           class="block group relative overflow-hidden rounded-xl shadow-lg border border-gray-800 hover:border-green-500/50 transition-colors">
                            
                            <div class="aspect-[2/3] w-full overflow-hidden bg-gray-800 relative">
                                <img src="${data.showThumbnail}" 
                                     alt="${data.showTitle}" 
                                     class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                     onerror="this.src='https://placehold.co/200x300?text=No+Image'">
                                     
                                <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50 backdrop-blur">
                                    <div class="h-full bg-green-500" style="width: ${data.isCompleted ? '100%' : '40%'}"></div>
                                </div>
                            </div>
                            
                            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-100">
                                <div class="absolute bottom-0 left-0 right-0 p-3">
                                    <p class="text-[10px] text-green-400 font-bold mb-0.5 uppercase tracking-wider">
                                        ตอนที่ ${data.lastWatchedEpisodeNumber}
                                    </p>
                                    <h3 class="text-sm font-bold text-white truncate leading-tight drop-shadow-md">
                                        ${data.showTitle}
                                    </h3>
                                    
                                    <div class="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                        <span class="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <i class="ri-play-fill"></i> ดูต่อ
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <div class="w-10 h-10 bg-green-500/90 rounded-full flex items-center justify-center shadow-xl backdrop-blur-sm transform scale-50 group-hover:scale-100 transition-transform duration-300">
                                    <i class="ri-play-fill text-white text-xl ml-0.5"></i>
                                </div>
                            </div>
                        </a>
                    </div>
                `;
            });

            historyList.innerHTML = html;

        } catch (error) {
            console.error("Error loading history:", error);
            // ถ้าโหลดไม่ได้ให้ซ่อน Section ไปเลย
            historySection.classList.add('hidden');
        }
    });
}
