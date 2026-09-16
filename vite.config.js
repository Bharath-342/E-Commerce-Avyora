import { defineConfig } from "vite";
import { resolve } from "node:path";

const pages = [
   "index",
   "register",
   "login",
   "account",
   "cart",
   "categories",
   "checkout",
   "favorites",
   "product",
   "success"
];

export default defineConfig({
   build: {
      rollupOptions: {
         input: Object.fromEntries(pages.map(page => [page, resolve(`${page}.html`)]))
      }
   }
});
