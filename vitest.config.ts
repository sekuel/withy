import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      withy: resolve(__dirname, "src/index.ts"),
    },
  },
});
