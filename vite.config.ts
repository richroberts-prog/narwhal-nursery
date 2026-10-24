import { defineConfig } from 'vite';

// Relative paths so the build works under GitHub Pages' /narwhal-nursery/ and anywhere else.
export default defineConfig({ base: './', server: { port: 5197, allowedHosts: ['.ts.net'] }, preview: { allowedHosts: ['.ts.net'] } });
