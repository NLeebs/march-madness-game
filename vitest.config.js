import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: [
      "node_modules",
      "dist",
      "data-scraping",
      "**/*.config.js",
      "**/*.config.ts",
      "src/components/Add-To-Firebase/Team-Stats-URL-Objects",
    ],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: ["app/**/*.tsx", "src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "**/*.config.js",
        "**/*.config.ts",
        "**/index.ts",
        "src/components/Add-To-Firebase/Team-Stats-URL-Objects/**",
      ],
    },
  },
  plugins: [tsconfigPaths()],
});
