import { defineConfig } from "tsup";
import { baseConfig } from "../../tsup.config";

export default defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"],
  external: [
    "@fabianopinto/errors",
    "@fabianopinto/logger",
    "@fabianopinto/utils",
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
