import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 1500 },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/portadas": "http://localhost:3000",
    },
  },
});
