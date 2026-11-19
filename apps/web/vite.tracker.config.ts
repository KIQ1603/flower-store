import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: { outDir: "dist-tracker", emptyOutDir: true, rollupOptions: { input: path.resolve(__dirname, "tracker.html") } },
});
