import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.config";

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
    },
  },
});
