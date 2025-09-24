/**
 * @packageDocumentation
 * Configuration resolvers for external references.
 *
 * This module provides a pluggable resolver system for handling external
 * configuration references. Includes built-in resolvers for AWS services
 * (SSM Parameter Store and S3) with advanced batch processing, caching
 * capabilities, and extensible architecture for any resolver type.
 */

export * from "./base.js";
export * from "./global-cache.js";
export * from "./registry.js";
export * from "./resolution-engine.js";
export * from "./s3-resolver.js";
export * from "./ssm-resolver.js";
