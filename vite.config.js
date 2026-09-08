import { defineConfig } from "vite";
import { resolve } from "path";

const base = process.env.GITHUB_PAGES === "true" ? "/blairandjack/" : "/";

export default defineConfig({
  base,
  root: ".",
  publicDir: "public",
  server: {
    port: 5173,
    open: true,
  },
  plugins: [
    {
      name: "gh-pages-public-urls",
      transformIndexHtml(html) {
        if (base === "/") return html;
        return html
          .replace(/(href|src|poster)="\/(images|videos|favicon\.jpg)/g, `$1="${base}$2`)
          .replace(/href="\/(science\.html|about\.html|shop\.html)"/g, `href="${base}$1"`)
          .replace(/href="\/"/g, `href="${base}"`);
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        science: resolve(__dirname, "science.html"),
        about: resolve(__dirname, "about.html"),
        shop: resolve(__dirname, "shop.html"),
      },
    },
  },
});
