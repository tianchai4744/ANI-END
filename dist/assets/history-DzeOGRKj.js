import{h as p,i as A,e as f,f as y,s as b,o as v,a as L,d as x,q as w,l as $,b as I,c as E}from"./db-config-CDOV0zmd.js";import{l as B}from"./navbar-BPKScrBx.js";import{s as m}from"./search-Cjk7YTPU.js";import{o as H}from"./tools-BcGrSTdy.js";let c,h=[],n,l,r,u,i;function T(e){return!e||!e.toDate?"N/A":e.toDate().toLocaleDateString("th-TH",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}async function S(){b("silent"),v(L,async e=>{e?(c=e.uid,u.classList.add("hidden"),D()):(l.classList.add("hidden"),u.classList.remove("hidden"),r.classList.add("hidden"),n.innerHTML="",i.classList.add("hidden"),m())})}function D(){const e=x(y,`artifacts/${f}/users/${c}/viewHistory`),t=w(e,I("watchedAt","desc"),$(50));l.classList.remove("hidden"),r.classList.add("hidden"),n.innerHTML="",E(t,s=>{if(l.classList.add("hidden"),h.length=0,s.empty){r.classList.remove("hidden"),i.classList.add("hidden"),m();return}r.classList.add("hidden"),i.classList.remove("hidden");let o="";s.forEach(a=>{const d=a.data();h.push({id:a.id,...d}),o+=k(a.id,d)}),n.innerHTML=o,H(n),m(),q()})}function k(e,t){const s=t.showTitle||"ไม่ระบุชื่อเรื่อง",o=t.lastWatchedEpisodeTitle||`ตอนที่ ${t.latestEpisodeNumber||"?"}`,a=t.showThumbnail||"https://placehold.co/160x90/333/fff?text=No+Img",d=T(t.watchedAt),g=`player.html?id=${t.showId}&ep_id=${t.lastWatchedEpisodeId}`;return`
        <div class="history-item flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-gray-900 border border-gray-800 relative group">
            <a href="${g}" class="block w-full sm:w-48 flex-shrink-0 relative">
                <div class="history-thumb-wrapper image-wrapper animate-pulse">
                    <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
                         data-src="${a}" 
                         alt="${s}" 
                         class="history-thumb opacity-0">
                </div>
                <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md pointer-events-none">
                    <i class="ri-play-circle-fill text-4xl text-green-500"></i>
                </div>
            </a>
            <div class="flex-1 min-w-0 flex flex-col justify-center">
                <a href="${g}" class="hover:text-green-500 transition-colors">
                    <h3 class="text-lg font-bold text-white truncate mb-1">${s}</h3>
                </a>
                <p class="text-green-400 text-sm font-medium mb-2">${o}</p>
                <p class="text-gray-500 text-xs flex items-center">
                    <i class="ri-time-line mr-1"></i> รับชมล่าสุด: ${d}
                </p>
            </div>
            <div class="absolute top-2 right-2 sm:static sm:self-center">
                <button class="delete-btn text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-500/10 transition-colors" data-id="${e}" title="ลบรายการนี้">
                    <i class="ri-delete-bin-line text-xl"></i>
                </button>
            </div>
        </div>
    `}function q(){document.querySelectorAll(".delete-btn").forEach(e=>{e.addEventListener("click",async t=>{const s=t.currentTarget.dataset.id;confirm("ลบประวัตินี้?")&&await p(A(y,`artifacts/${f}/users/${c}/viewHistory`,s))})})}document.addEventListener("DOMContentLoaded",async()=>{await B(".."),n=document.getElementById("history-list"),l=document.getElementById("loading-state"),r=document.getElementById("empty-state"),u=document.getElementById("login-required-state"),i=document.getElementById("clear-history-btn");const e=document.getElementById("btn-login-page");e&&(e.onclick=()=>window.triggerLogin()),i&&i.addEventListener("click",async()=>{if(confirm("ลบประวัติทั้งหมด?")){const t=h.map(s=>p(A(y,`artifacts/${f}/users/${c}/viewHistory`,s.id)));await Promise.all(t)}}),S()});
