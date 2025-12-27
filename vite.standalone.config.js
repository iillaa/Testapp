import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// This config is ONLY for the offline HTML version
export default defineConfig({
  plugins: [react(), viteSingleFile()],
    base: "./",
      build: {
          target: "esnext",
              assetsInlineLimit: 100000000,
                  chunkSizeWarningLimit: 100000000,
                      cssCodeSplit: false,
                          brotliSize: false,
                              rollupOptions: {
                                    inlineDynamicImports: true,
                                        },
                                            outDir: "dist-standalone" // Output to a different folder so it doesn't mess up Android
                                              },
                                              });