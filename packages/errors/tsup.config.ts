import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  skipNodeModulesBundle: true,
  external: [],
  splitting: false,
  treeshake: true,
  minify: false,
});
