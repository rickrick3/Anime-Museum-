// vite.config.js - Two pages: the museum (index.html) and the original desert parable (mirage.html)
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                museum: resolve(__dirname, 'index.html'),
                mirage: resolve(__dirname, 'mirage.html')
            }
        }
    }
});
