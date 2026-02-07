import{h as p,i as b,a as f,d as y,s as L,o as v,b as x,f as w,q as $,l as E,c as I,e as H}from"./db-config-JzEx42YR.js";import{s as h}from"./search-CnOzQKex.js";import{l as T}from"./navbar-DtgS--Xs.js";import"https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";import"./tools-Cv2G4J4g.js";let m,d=[],l,c,n,u,s;function S(t){return!t||!t.toDate?"N/A":t.toDate().toLocaleDateString("th-TH",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}async function B(){L("silent"),v(x,async t=>{t?(m=t.uid,u.classList.add("hidden"),k()):(c.classList.add("hidden"),u.classList.remove("hidden"),n.classList.add("hidden"),l.innerHTML="",s.classList.add("hidden"),h([]))})}function k(){const t=w(y,`artifacts/${f}/users/${m}/viewHistory`),e=$(t,I("watchedAt","desc"),E(50));c.classList.remove("hidden"),n.classList.add("hidden"),l.innerHTML="",H(e,i=>{if(c.classList.add("hidden"),d.length=0,i.empty){n.classList.remove("hidden"),s.classList.add("hidden"),h([]);return}n.classList.add("hidden"),s.classList.remove("hidden");let o="";i.forEach(a=>{const r=a.data();d.push({id:a.id,...r}),o+=D(a.id,r)}),l.innerHTML=o,h(d),q()})}function D(t,e){const i=e.showTitle||"ไม่ระบุชื่อเรื่อง",o=e.lastWatchedEpisodeTitle||`ตอนที่ ${e.latestEpisodeNumber||"?"}`,a=e.showThumbnail||"https://placehold.co/160x90/333/fff?text=No+Img",r=S(e.watchedAt),g=`player.html?id=${e.showId}&ep_id=${e.lastWatchedEpisodeId}`;return`
                <div class="history-item flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-gray-900 border border-gray-800 relative group">
                    <a href="${g}" class="block w-full sm:w-48 flex-shrink-0 relative">
                        <img src="${a}" alt="${i}" class="history-thumb w-full h-28 sm:h-28 rounded-md shadow-md">
                        <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                            <i class="ri-play-circle-fill text-4xl text-green-500"></i>
                        </div>
                    </a>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                        <a href="${g}" class="hover:text-green-500 transition-colors">
                            <h3 class="text-lg font-bold text-white truncate mb-1">${i}</h3>
                        </a>
                        <p class="text-green-400 text-sm font-medium mb-2">${o}</p>
                        <p class="text-gray-500 text-xs flex items-center">
                            <i class="ri-time-line mr-1"></i> รับชมล่าสุด: ${r}
                        </p>
                    </div>
                    <div class="absolute top-2 right-2 sm:static sm:self-center">
                        <button class="delete-btn text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-500/10 transition-colors" data-id="${t}" title="ลบรายการนี้">
                            <i class="ri-delete-bin-line text-xl"></i>
                        </button>
                    </div>
                </div>
            `}function q(){document.querySelectorAll(".delete-btn").forEach(t=>{t.addEventListener("click",async e=>{const i=e.currentTarget.dataset.id;confirm("ลบประวัตินี้?")&&await p(b(y,`artifacts/${f}/users/${m}/viewHistory`,i))})})}document.addEventListener("DOMContentLoaded",async()=>{await T(".."),l=document.getElementById("history-list"),c=document.getElementById("loading-state"),n=document.getElementById("empty-state"),u=document.getElementById("login-required-state"),s=document.getElementById("clear-history-btn");const t=document.getElementById("btn-login-page");t&&(t.onclick=()=>window.triggerLogin()),s&&s.addEventListener("click",async()=>{if(confirm("ลบประวัติทั้งหมด?")){const e=d.map(i=>p(b(y,`artifacts/${f}/users/${m}/viewHistory`,i.id)));await Promise.all(e)}}),B()});
