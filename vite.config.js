
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  root: "./src",

  // Audio and other static assets live in the repository-level public/ folder,
  // not src/public/. Explicitly tell Vite to copy and serve that directory.
  publicDir: "../public",

  // GitHub Pages needs the repository path.
  // Local development should use the website root.
  base: command === "build" ? "/Game-Design/" : "/",

  build: {
    outDir: "../dist",
  },

  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
  },
}));
