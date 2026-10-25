import { defineConfig, devices } from '@playwright/test';

// Plays the built game by touch on Isabelle's iPad Pro, held sideways. SHOTS=<dir> saves screenshots.
export default defineConfig({
  testDir: 'e2e',
  timeout: 300_000,
  // Two at a time: the 3D is drawn in software (Mesa), and four at once overloads the server.
  workers: 2,
  // Less motion so taps don't wait for bobbing children to hold still.
  use: { baseURL: 'http://127.0.0.1:4212/', screenshot: 'only-on-failure', contextOptions: { reducedMotion: 'reduce' }, launchOptions: { args: ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'] } },
  projects: [
    { name: 'ipad', use: { ...devices['iPad Pro 11 landscape'], browserName: 'chromium' } },
  ],
  webServer: { command: 'npx vite build && npx vite preview --port 4212 --strictPort', url: 'http://127.0.0.1:4212/', reuseExistingServer: false },
});
