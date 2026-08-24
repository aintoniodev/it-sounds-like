// Build del cliente fino público: solo la entrada publico.html, salida
// directa en dist-public (donde el CI deja index.json y las functions).
// emptyOutDir en false: el build no debe borrar el índice ni las functions.
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 1500,
    emptyOutDir: false,
    outDir: "../dist-public",
    rollupOptions: { input: "publico.html" },
  },
});
