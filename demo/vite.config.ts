import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "../src")
    }
  },
  server: {
    port: 5173
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true
  }
});
