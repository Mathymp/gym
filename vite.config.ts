import { copyFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => {
  const pages = process.env.GITHUB_PAGES === "1";
  const base = pages ? "/gym/" : "/";
  return {
    base,
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false,
        includeAssets: ["favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
        manifest: {
          name: "FORMA",
          short_name: "FORMA",
          description: "Seguimiento de tu entrenamiento",
          lang: "es-CL",
          dir: "ltr",
          start_url: base,
          scope: base,
          display: "standalone",
          orientation: "portrait",
          background_color: "#f3f6fb",
          theme_color: "#f3f6fb",
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          navigateFallback: `${base}index.html`,
          globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest,json}"],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.includes("/exercises/") && url.pathname.endsWith(".jpg"),
              handler: "CacheFirst",
              options: {
                cacheName: "forma-exercises",
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 180 },
              },
            },
          ],
        },
      }),
      {
        name: "pages-fallback",
        apply: "build" as const,
        closeBundle() {
          if (!pages) return;
          copyFileSync("dist/index.html", "dist/404.html");
        },
      },
    ],
  };
});
