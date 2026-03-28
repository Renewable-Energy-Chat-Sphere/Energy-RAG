import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Ener-Sphere/",
  plugins: [
    react({
      jsxRuntime: "automatic", 
    }),
  ],
});