import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.config";

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"],
  external: [
    "@t68/errors",
    "@t68/logger",
    "@t68/utils",
    "@aws-sdk/client-ssm",
    "@aws-sdk/client-s3",
  ],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
    },
  },
});
