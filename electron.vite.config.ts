// Build config for the desktop app (CLI/hooks stay no-build). electron-vite bundles three
// targets — main, preload, renderer — into out/{main,preload,renderer}. The preload is
// emitted as CJS so it can run with Electron's renderer sandbox enabled.

import { resolve } from "node:path";
import { defineConfig } from "electron-vite";

// Resolve from the project root (where `npm run app:*` runs). Avoids __dirname, which is
// unavailable in this ESM config file.
const root = process.cwd();

export default defineConfig({
  main: {
    build: {
      rollupOptions: { input: { index: resolve(root, "src/desktop/main.ts") } },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve(root, "src/desktop/preload.ts") },
        output: { format: "cjs", entryFileNames: "[name].cjs" },
      },
    },
  },
  renderer: {
    root: resolve(root, "src/desktop/renderer"),
    build: {
      rollupOptions: { input: { index: resolve(root, "src/desktop/renderer/index.html") } },
    },
  },
});
