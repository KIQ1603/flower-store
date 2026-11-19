import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Trang quản trị (Ant Design) được lazy-load nên Rollup tự tách thành gói riêng: khách không phải tải
  build: { chunkSizeWarningLimit: 1400 },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
