/**
 * @fileoverview Default implementation of the resolver registry.
 *
 * Manages the lifecycle and lookup of configuration resolvers. Provides
 * thread-safe registration and supports dynamic resolver management with
 * proper cleanup handling.
 */

import type { Logger } from "@t68/logger";

import type { ConfigResolver, ResolverRegistry } from "./base.js";
import { extractProtocol } from "./base.js";

/**
 * Default implementation of `ResolverRegistry`.
 *
 * Manages resolver registration, lookup, and lifecycle. Ensures that each
 * protocol can only have one active resolver and handles initialization
 * and cleanup properly.
 */
export class DefaultResolverRegistry implements ResolverRegistry {
  private readonly resolvers = new Map<string, ConfigResolver>();

  /**
   * Register a resolver for a specific protocol.
   *
   * If a resolver for the same protocol already exists, it will be unregistered
   * first. The new resolver's `initialize` method is called during registration.
   *
   * @param resolver - Resolver instance to register
   * @param logger - Logger for initialization and diagnostics
   */
  public async register<T extends Record<string, unknown>>(
    resolver: ConfigResolver<T>,
    logger: Logger,
  ): Promise<void> {
    const protocol = resolver.protocol.toLowerCase();

    // Unregister existing resolver for this protocol
    if (this.resolvers.has(protocol)) {
      await this.unregister(protocol);
    }

    // Initialize the new resolver
    await resolver.initialize(logger);
    this.resolvers.set(protocol, resolver);

    logger.debug({ protocol }, "Resolver registered");
  }

  /**
   * Unregister a resolver by protocol.
   *
   * Calls the resolver's `cleanup` method if available before removing it
   * from the registry.
   *
   * @param protocol - Protocol identifier to unregister
   */
  public async unregister(protocol: string): Promise<void> {
    const normalizedProtocol = protocol.toLowerCase();
    const resolver = this.resolvers.get(normalizedProtocol);

    if (resolver) {
      if (resolver.cleanup) {
        await resolver.cleanup();
      }
      this.resolvers.delete(normalizedProtocol);
    }
  }

  /**
   * Get a resolver by protocol.
   *
   * @param protocol - Protocol identifier (case-insensitive)
   * @returns Resolver instance or `undefined` if not found
   */
  public getResolver(protocol: string): ConfigResolver | undefined {
    return this.resolvers.get(protocol.toLowerCase());
  }

  /**
   * Get all registered protocol identifiers.
   *
   * @returns Array of protocol strings in lowercase
   */
  public getProtocols(): string[] {
    return Array.from(this.resolvers.keys());
  }

  /**
   * Check if a reference can be resolved by any registered resolver.
   *
   * @param reference - External reference string
   * @returns `true` if any resolver can handle this reference
   */
  public canResolve(reference: string): boolean {
    const protocol = extractProtocol(reference);
    if (!protocol) return false;

    const resolver = this.getResolver(protocol);
    return resolver ? resolver.validateReference(reference) : false;
  }

  /**
   * Clean up all registered resolvers.
   *
   * Calls `cleanup` on all resolvers that support it, then clears the registry.
   */
  public async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.resolvers.values())
      .filter((resolver) => resolver.cleanup)
      .map((resolver) => resolver.cleanup!());

    await Promise.all(cleanupPromises);
    this.resolvers.clear();
  }
}
