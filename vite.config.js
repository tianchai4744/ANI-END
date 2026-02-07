import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // ⚠️ ต้องเพิ่มบรรทัดนี้ครับ! ไม่งั้นขึ้น GitHub แล้วหน้าขาว
  // เปลี่ยน 'ANI-END' เป็นชื่อ Repository ของคุณจริงๆ
  base: '/ANI-END/', 

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        bookmarks: resolve(__dirname, 'pages/bookmarks.html'),
        grid: resolve(__dirname, 'pages/grid.html'),
        history: resolve(__dirname, 'pages/history.html'),
        player: resolve(__dirname, 'pages/player.html'),
        profile: resolve(__dirname, 'pages/profile.html'),
        admin: resolve(__dirname, 'admin/admin.html')
      },
    },
  },
  server: {
    open: true
  }
});
