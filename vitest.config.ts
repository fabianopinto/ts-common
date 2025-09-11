import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Collect tests from all workspace packages to run a single, merged session
    include: [
      // When running from repo root
      "packages/*/test/**/*.{test,spec}.?(c|m)[jt]s?(x)",
      // When running from a package directory (pnpm -r test)
      "**/test/**/*.{test,spec}.?(c|m)[jt]s?(x)",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Emit a single coverage directory at the repo root
      reportsDirectory: "coverage",
    },
  },
});
