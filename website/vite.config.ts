import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Bundle these CJS deps into the SSR build (used for build-time prerendering)
  // so the prerender entry imports cleanly under Node ESM.
  ssr: {
    noExternal: ["react-helmet-async", "react-fast-compare", "invariant", "shallowequal"],
  },
})
