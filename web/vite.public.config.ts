// Build del cliente fino público: publico.html (promovido a index.html por
// build-public) y privacidad.html, salida directa en dist-public (donde el
// CI deja index.json y las functions). emptyOutDir en false: el build no
// debe borrar el índice ni las functions.
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 1500,
    emptyOutDir: false,
    outDir: "../dist-public",
    rollupOptions: { input: { publico: "publico.html", privacidad: "privacidad.html" } },
  },
});
