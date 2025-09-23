import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.config";

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"],
  external: ["@t68/errors", "@t68/logger"],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
    },
  },
});
