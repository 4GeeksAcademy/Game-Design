
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  root: "./src",

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
