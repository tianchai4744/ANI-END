// ✅ แก้ไข: เปลี่ยนจาก CDN เป็น npm package
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

export async function renderPlayerTop10(historyItems) {
    const container = document.getElementById('top10-list-container');
    if (!container) return;

    try {
        const q = query(collection(db, `artifacts/${appId}/public/data/shows`), orderBy("viewCount", "desc"), limit(10));
        const snapshot = await getDocs(q);
        
        let html = '';
        let rank = 1;

        snapshot.forEach((doc) => {
            const show = { id: doc.id, ...doc.data() };
            const history = historyItems.find(h => h.showId === show.id);
            
            let link = `player.html?id=${show.id}`;
            if (history && history.lastWatchedEpisodeId) {
                link += `&ep_id=${history.lastWatchedEpisodeId}`;
            }

            html += `
                <a href="${link}" class="top10-item hover:shadow-lg bg-gray-700 flex items-center p-2 rounded-lg mb-2 transition-colors group"> 
                    <span class="rank-badge-lg rank-${rank} w-8 text-center font-bold text-xl mr-3 ${getRankColor(rank)}">${rank}</span>
                    <img src="${show.thumbnailUrl}" class="w-12 h-16 object-cover rounded shadow-md bg-gray-600 flex-shrink-0">
                    <div class="top10-content flex-grow ml-3 min-w-0">
                        <h4 class="font-bold text-white line-clamp-2 text-sm group-hover:text-green-400 transition-colors">${show.title}</h4>
                        <p class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <i class="ri-eye-line"></i> ${show.viewCount || 0}
                        </p>
                    </div>
                </a>
            `;
            rank++;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error("Top 10 Error", error);
    }
}

function getRankColor(rank) {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-500';
}
