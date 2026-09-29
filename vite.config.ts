import { copyFileSync } from "node:fs"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// 站点挂在 faustknowsall.cc 根路径。GitHub Pages 没有服务端回退，用 404.html 承接直接打开的子路径。
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    {
      name: "github-pages-fallback",
      apply: "build",
      closeBundle() {
        copyFileSync("dist/index.html", "dist/404.html")
      },
    },
  ],
})
