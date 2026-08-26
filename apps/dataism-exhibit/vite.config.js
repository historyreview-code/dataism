import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 部署子路径用 VITE_BASE 覆盖（GitHub Pages 用 '/dataism-exhibit/' 之类）
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5176, // exhibit 专用端口
  },
})
