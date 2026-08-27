import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

// add config to use with docker
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // cho phép truy cập từ ngoài container
    port: 5173,
    watch: {
      usePolling: true, // Giúp hot-reload hoạt động mượt hơn trên Windows/Docker
    }
  }
})