import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Bilder und Sounds liegen nur einmal im Projekt: apps/tv/public/assets
  publicDir: '../tv/public',
})
