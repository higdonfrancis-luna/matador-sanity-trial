import {defineConfig} from 'vite'
import {resolve} from 'node:path'

export default defineConfig({
  root: 'web',
  publicDir: 'public',
  build: {outDir: resolve('dist'), emptyOutDir: true},
})
