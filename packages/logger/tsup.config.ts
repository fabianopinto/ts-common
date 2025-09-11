import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.config";

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"],
  external: ["pino", "pino-pretty", "@fabianopinto/errors"],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
    },
  },
});
