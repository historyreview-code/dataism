import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5175, // dronestorm 默认端口 (避免和 dataism-17 冲突)
  },
})