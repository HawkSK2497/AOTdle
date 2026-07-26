import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The API speaks plain HTTP — an https target here fails every request.
    proxy: { "/api": "http://localhost:3001" },
  },
});
