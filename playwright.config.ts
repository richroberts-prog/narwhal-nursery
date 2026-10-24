import { defineConfig, devices } from '@playwright/test';

// Plays the built game by touch at iPad and Fire tablet sizes. SHOTS=<dir> saves screenshots.
const fire = { browserName: 'chromium' as const, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 11; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/120 like Chrome/120 Safari/537.36' };
export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  workers: 4,
  // Less motion so taps don't wait for bobbing children to hold still.
  use: { baseURL: 'http://127.0.0.1:4212/', screenshot: 'only-on-failure', contextOptions: { reducedMotion: 'reduce' } },
  projects: [
    { name: 'ipad', use: { ...devices['iPad Pro 11 landscape'], browserName: 'chromium' } },
    { name: 'ipad-portrait', use: { ...devices['iPad Pro 11'], browserName: 'chromium' } },
    { name: 'fire-hd10', use: { ...fire, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 } },
    { name: 'fire-hd8', use: { ...fire, viewport: { width: 962, height: 601 }, deviceScaleFactor: 1.33 } },
  ],
  webServer: { command: 'npx vite build && npx vite preview --port 4212 --strictPort', url: 'http://127.0.0.1:4212/', reuseExistingServer: false },
});
