import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GITHUB_PAGES_BASE deve ser definido no GitHub Actions como '/nome-do-repo/'
// Em localhost (npm run dev) usa '/'
const base = '/biblioteca_proibida/'

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
