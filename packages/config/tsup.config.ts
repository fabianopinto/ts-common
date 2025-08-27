import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  skipNodeModulesBundle: true,
  external: ["dotenv", "zod"],
  splitting: false,
  treeshake: true,
  minify: false,
});
