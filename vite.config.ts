import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@flowforge/shared-engine': path.resolve(__dirname, './packages/shared/engine/src/index.ts'),
      '@shared/engine': path.resolve(__dirname, './packages/shared/engine/src/index.ts'),
    },
  },
})
