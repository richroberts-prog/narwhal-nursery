import { defineConfig } from 'vitest/config';

// Browser journeys in e2e/ belong to Playwright.
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } });
