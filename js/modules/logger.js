import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db, appId } from "../config/db-config.js";

export function initGlobalErrorLogging() {
    if (window.isLoggerInitialized) return;
    window.isLoggerInitialized = true;

    // ดักจับ Error ทั่วไป
    window.onerror = async function(message, source, lineno, colno, error) {
        if (message === 'Script error.') return; // ข้าม Error จาก 3rd party
        
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
        try {
            await addDoc(collection(db, `artifacts/${appId}/system_logs`), {
                type: 'UNHANDLED_PROMISE',
                message: event.reason ? (event.reason.message || event.reason) : 'Unknown Promise Error',
                timestamp: serverTimestamp(),
                url: window.location.href
            });
        } catch(e) {}
    });

    console.log("✅ Global Error Logging Initialized");
}
