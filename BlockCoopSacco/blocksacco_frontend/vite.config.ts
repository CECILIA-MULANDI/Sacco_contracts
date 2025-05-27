import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    open: true
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: true,
    open: true
  },
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          thirdweb: ["@thirdweb-dev/react", "@thirdweb-dev/sdk", "thirdweb"]
        }
      }
    }
  }
});
