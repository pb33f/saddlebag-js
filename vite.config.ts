// vite.config.ts
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    
    build: {
        minify: true,
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'saddlebag',
            fileName: 'saddlebag',
        },
    },
});