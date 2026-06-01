import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // Only run TypeScript tests from src; ignore the compiled output in dist.
        include: ['src/**/*.test.ts'],
    },
})
