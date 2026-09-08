import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            include: ['src/*.ts'],
            exclude: ['src/*.spec.ts', 'src/vite-env.d.ts'],
            reporter: ['text', 'json', 'html'],
            thresholds: {
                'src/persistent-bag.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
            },
        },
    },
})
