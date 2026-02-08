import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, appId } from "../config/db-config.js";

// Set เก็บ Error ที่เคยส่งไปแล้ว เพื่อป้องกันการส่งซ้ำรัวๆ
const sentErrors = new Set();

export function initGlobalErrorLogging() {
    if (window.isLoggerInitialized) return;
    window.isLoggerInitialized = true;

    // ดักจับ Error ทั่วไป
    window.onerror = async function(message, source, lineno, colno, error) {
        if (message === 'Script error.') return; 
        
        // สร้าง Key เฉพาะสำหรับ Error นี้
        const errorKey = `${message}_${lineno}_${source}`;

        // ถ้าเคยส่งแล้ว ให้ข้ามเลย (ประหยัดโควต้า Write)
        if (sentErrors.has(errorKey)) return;
        
        sentErrors.add(errorKey);
        
        // ตั้งเวลาลบ Key ออกหลังจาก 5 นาที (เผื่ออยากรู้ว่ามันยัง error อยู่ไหมในภายหลัง)
        setTimeout(() => sentErrors.delete(errorKey), 300000);

        console.error("🚨 ANI-END System Log:", message);
        
        try {
            await addDoc(collection(db, `artifacts/${appId}/system_logs`), {
                type: 'CRITICAL_ERROR',
                message: message,
                source: source || 'unknown',
                line: lineno || 0,
                stack: error ? error.stack : 'no-stack',
                userAgent: navigator.userAgent,
                timestamp: serverTimestamp(),
                url: window.location.href
            });
        } catch(e) {
            console.warn("Logging failed (Offline or Permission denied)");
        }
    };
    
    // ดักจับ Promise Error (เช่น ลืม try-catch)
    window.addEventListener('unhandledrejection', async (event) => {
        const msg = event.reason ? (event.reason.message || event.reason) : 'Unknown Promise Error';
        
        // ใช้ Logic เดียวกันกับ onerror
        if (sentErrors.has(msg)) return;
        sentErrors.add(msg);
        setTimeout(() => sentErrors.delete(msg), 300000);

        try {
            await addDoc(collection(db, `artifacts/${appId}/system_logs`), {
                type: 'UNHANDLED_PROMISE',
                message: msg,
                timestamp: serverTimestamp(),
                url: window.location.href
            });
        } catch(e) {}
    });

    console.log("✅ Global Error Logging Initialized (Optimized)");
}
