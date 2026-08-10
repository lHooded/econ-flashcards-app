import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const base = mode === "production" ? "/econ-flashcards-app/" : "/";

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "icon-192.svg", "icon-512.svg"],
        manifest: {
          name: "Econ Cram Cards",
          short_name: "Econ Cards",
          description: "Offline macroeconomics Exam-SRS flashcards.",
          start_url: base,
          scope: base,
          display: "standalone",
          orientation: "portrait-primary",
          theme_color: "#102a43",
          background_color: "#f4f7fb",
          icons: [
            {
              src: `${base}icon-192.svg`,
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
            {
              src: `${base}icon-512.svg`,
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,json,woff2}"],
        },
      }),
    ],
  };
});
