import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: '/' 本地开发 + 同源部署；如要部署到 GitHub Pages 子路径改成 '/dataism/' 之类
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: true, // 监听所有网卡，方便移动设备测试
  },
})