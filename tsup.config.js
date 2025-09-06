import { defineConfig } from "tsup";

/**
 * Base configuration for all packages.
 * @type {import('tsup').Options}
 */
export const baseConfig = {
  // Output both ESM and CJS formats
  format: ["esm", "cjs"],

  // Disable .d.ts generation by default (can be overridden per package)
  dts: { resolve: true },

  // Generate source maps for better debugging
  sourcemap: true,

  // Clean output directory before building
  clean: true,

  // Target modern JavaScript
  target: "node22",

  // Build for Node.js runtime by default
  platform: "node",

  // Output directory
  outDir: "dist",

  // Skip bundling node_modules
  skipNodeModulesBundle: true,

  // Disable code splitting (simpler output)
  splitting: false,

  // Enable tree-shaking
  treeshake: true,

  // Disable minification for better debugging
  minify: false,

  // Common external packages (prevents bundling)
  external: [],

  // Bundle-specific configurations
  bundle: true,

  // Keep names for better debugging
  keepNames: true,
};

/**
 * Default configuration that can be extended by packages
 * @type {import('tsup').Options}
 */
export default defineConfig((options) => ({
  ...baseConfig,
  entry: ["src/index.ts"],
  ...options,
}));
