import { defineConfig, loadEnv } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    root: resolve(__dirname, "src/client"),
    resolve: {
      alias: {
        "@shared": resolve(__dirname, "shared"),
        "@client": resolve(__dirname, "src/client"),
      },
    },
    server: {
      port: parseInt(env.CLIENT_PORT || "5173"),
      proxy: {
        "/socket.io": {
          target: `http://localhost:${env.SERVER_PORT || "3000"}`,
          ws: true,
        },
      },
    },
    build: {
    outDir: resolve(__dirname, "dist/client"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/client/index.html"),
        testAudio: resolve(__dirname, "src/client/test-audio.html"),
      },
    },
  }
}});
