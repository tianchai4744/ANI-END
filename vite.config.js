import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // ⚠️ สำคัญมาก! เปลี่ยน 'ANI-END' เป็นชื่อ Repository ของคุณใน GitHub
  // ถ้าชื่อ Repo คุณคือ "my-anime-web" ก็ให้ใส่ '/my-anime-web/'
  // ถ้าไม่ใส่บรรทัดนี้ เวลาขึ้นเว็บจริง หน้าจอจะขาวครับ
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
