import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// —— 帧捕获中间件（仅 dev）：页面 ?export=1 时把 canvas.toDataURL POST 到这里落盘，
//    用于无头采集素材——绕开截图/合成读回管线（该链路在机器空闲时会产出黑帧）。
function frameSink() {
  return {
    name: 'frame-sink',
    configureServer(server) {
      server.middlewares.use('/__frame_sink', (req, res) => {
        if (req.method !== 'POST') { res.end('ok'); return }
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', () => {
          try {
            const { tag, data, meta } = JSON.parse(body)
            const dir = '/Users/newclaw/创意编程探索/dataism/showcase/intro/assets/posted'
            fs.mkdirSync(dir, { recursive: true })
            fs.writeFileSync(`${dir}/f-${tag}.png`, Buffer.from(data.split(',')[1], 'base64'))
            if (meta) fs.writeFileSync(`${dir}/f-${tag}.json`, meta)
          } catch { /* 静默：采集通道不许干扰展品 */ }
          res.end('ok')
        })
      })
    },
  }
}

// 部署子路径用 VITE_BASE 覆盖（GitHub Pages 用 '/dataism-exhibit/' 之类）
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), frameSink()],
  server: {
    host: true,
    port: 5176, // exhibit 专用端口
  },
})
