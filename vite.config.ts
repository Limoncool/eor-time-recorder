import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base 設為你的 GitHub repo 名稱，部署到 GitHub Pages 時才能正確載入資源
export default defineConfig({
  plugins: [react()],
  base: '/eor-time-recorder/',
})
