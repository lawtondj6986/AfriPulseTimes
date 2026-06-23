import { defineConfig } from 'vite';

// AfriPulse Times — Vite config
//
// The site is the single-file SPA `public/afripulse-preview.html`. It lives in
// `public/` so Vite copies it to the build output byte-for-byte (no processing,
// no minification) — it stays exactly as authored. The root `index.html` is the
// only Vite entry; it redirects `/` -> `/afripulse-preview.html` so the dev
// server, `vite build`, and Vercel all land on the real page.
export default defineConfig({
  server: {
    open: '/afripulse-preview.html',
  },
});
