/**
 * @fileoverview Test helpers and utilities for configuration tests.
 *
 * Provides mock loggers, AWS SDK mocks, test data fixtures, and common
 * test utilities to ensure consistent and reliable testing across all
 * configuration components.
 */

import type { Logger } from "@t68/logger";
import { vi } from "vitest";

/**
 * Create a minimal test logger that implements the Logger interface.
 * Captures all log calls for verification in tests.
 *
 * @returns A test logger with a `logs` array property for inspection.
 */
export function createTestLogger(): Logger & { logs: Array<[string, ...unknown[]]> } {
  const logs: Array<[string, ...unknown[]]> = [];

  const logger: Logger & { logs: Array<[string, ...unknown[]]> } = {
    logs,
    isLevelEnabled: vi.fn(() => true),
    setLevel: vi.fn(),
    trace: vi.fn((...args: unknown[]) => logs.push(["trace", ...args])),
    debug: vi.fn((...args: unknown[]) => logs.push(["debug", ...args])),
    info: vi.fn((...args: unknown[]) => logs.push(["info", ...args])),
    warn: vi.fn((...args: unknown[]) => logs.push(["warn", ...args])),
    error: vi.fn((...args: unknown[]) => logs.push(["error", ...args])),
    fatal: vi.fn((...args: unknown[]) => logs.push(["fatal", ...args])),
    child: vi.fn(function (this: Logger) {
      return this;
    }),
  };

  return logger;
}

/**
 * Mock AWS SSM Client for testing SSM resolver functionality.
 *
 * @param responses - A map of parameter names to their responses.
 * @returns A mock SSM client with a `mockSend` function for inspection.
 */
export function createMockSSMClient(responses: Record<string, unknown> = {}) {
  const mockSend = vi.fn();

  // Configure default responses
  Object.entries(responses).forEach(([paramName, response]) => {
    mockSend.mockImplementation((command: { input?: { Name?: string } }) => {
      if (command.input?.Name === paramName) {
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`Parameter ${command.input?.Name} not found`));
    });
  });

  const mockClient = {
    send: mockSend,
    destroy: vi.fn(),
  };

  return {
    SSMClient: vi.fn().mockImplementation(() => mockClient),
    GetParameterCommand: vi.fn().mockImplementation((input) => ({ input })),
    GetParametersCommand: vi.fn().mockImplementation((input) => ({ input })),
    mockSend,
    mockClient,
  };
}

/**
 * Mock AWS S3 Client for testing S3 resolver functionality.
 *
 * @param responses - A map of S3 keys to their responses.
 * @returns A mock S3 client with a `mockSend` function for inspection.
 */
export function createMockS3Client(responses: Record<string, unknown> = {}) {
  const mockSend = vi.fn();

  // Configure default responses
  Object.entries(responses).forEach(([s3Key, response]) => {
    mockSend.mockImplementation((command: { input?: { Bucket?: string; Key?: string } }) => {
      const key = `${command.input?.Bucket}/${command.input?.Key}`;
      if (key === s3Key) {
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`S3 object ${key} not found`));
    });
  });

  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    HeadObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
    mockSend,
  };
}

/**
 * Create a mock readable stream for S3 body responses.
 *
 * @param data - The data to be read from the stream.
 * @returns A mock stream with an `on` function for inspection.
 */
export function createMockStream(data: string) {
  const chunks = [Buffer.from(data)];
  let index = 0;

  return {
    on: vi.fn((event: string, callback: (chunk?: Buffer) => void) => {
      if (event === "data") {
        chunks.forEach((chunk) => callback(chunk));
      } else if (event === "end") {
        setTimeout(() => callback(), 0);
      }
    }),
    transformToString: vi.fn(async () => data),
  };
}

/**
 * Test configuration data fixtures.
 */
export const testConfigs = {
  simple: {
    app: {
      name: "test-app",
      version: "1.0.0",
    },
    database: {
      host: "localhost",
      port: 5432,
    },
  },

  withExternalRefs: {
    app: {
      name: "test-app",
      apiKey: "ssm:/test/api-key",
    },
    database: {
      host: "ssm:/test/db/host",
      password: "ssm-secure:/test/db/password",
    },
    config: {
      template: "s3://test-bucket/template.json",
    },
  },

  complex: {
    services: {
      auth: {
        endpoint: "ssm:/prod/auth/endpoint",
        credentials: {
          clientId: "ssm:/prod/auth/client-id",
          clientSecret: "ssm-secure:/prod/auth/client-secret",
        },
      },
      database: {
        primary: {
          host: "ssm:/prod/db/primary/host",
          port: "ssm:/prod/db/primary/port",
          credentials: {
            username: "ssm:/prod/db/primary/username",
            password: "ssm-secure:/prod/db/primary/password",
          },
        },
        replica: {
          host: "ssm:/prod/db/replica/host",
          port: "ssm:/prod/db/replica/port",
        },
      },
    },
    features: {
      enableNewUI: true,
      enableBetaFeatures: false,
      configFile: "s3://config-bucket/features.json",
    },
    arrays: [
      "ssm:/test/array/item1",
      "static-value",
      {
        nested: "ssm-secure:/test/nested/secret",
      },
    ],
  },

  edgeCases: {
    nullValue: null,
    emptyString: "",
    zeroNumber: 0,
    falseBoolean: false,
    emptyArray: [],
    emptyObject: {},
    deepNesting: {
      level1: {
        level2: {
          level3: {
            level4: {
              value: "ssm:/deep/nested/value",
            },
          },
        },
      },
    },
  },
};

/**
 * Common test scenarios for edge cases and ternary operators.
 */
export const edgeCaseScenarios = [
  {
    name: "null values",
    input: null,
    expected: null,
  },
  {
    name: "undefined values",
    input: undefined,
    expected: undefined,
  },
  {
    name: "empty strings",
    input: "",
    expected: "",
  },
  {
    name: "zero numbers",
    input: 0,
    expected: 0,
  },
  {
    name: "false booleans",
    input: false,
    expected: false,
  },
  {
    name: "empty arrays",
    input: [],
    expected: [],
  },
  {
    name: "empty objects",
    input: {},
    expected: {},
  },
];

/**
 * Test scenarios for short-circuit expressions and ternary operators.
 */
export const shortCircuitScenarios = [
  {
    name: "falsy && expression should short-circuit",
    condition: false,
    value: "ssm:/should-not-resolve",
    shouldResolve: false,
  },
  {
    name: "truthy && expression should evaluate",
    condition: true,
    value: "ssm:/should-resolve",
    shouldResolve: true,
  },
  {
    name: "truthy || expression should short-circuit",
    condition: true,
    fallback: "ssm:/should-not-resolve",
    shouldResolve: false,
  },
  {
    name: "falsy || expression should evaluate fallback",
    condition: false,
    fallback: "ssm:/should-resolve",
    shouldResolve: true,
  },
];

/**
 * Performance test scenarios for batch processing.
 */
export const performanceScenarios = {
  smallBatch: Array.from({ length: 5 }, (_, i) => `ssm:/test/param${i}`),
  mediumBatch: Array.from({ length: 15 }, (_, i) => `ssm:/test/param${i}`),
  largeBatch: Array.from({ length: 50 }, (_, i) => `ssm:/test/param${i}`),
  mixedProtocols: [
    ...Array.from({ length: 10 }, (_, i) => `ssm:/test/param${i}`),
    ...Array.from({ length: 5 }, (_, i) => `ssm-secure:/test/secret${i}`),
    ...Array.from({ length: 3 }, (_, i) => `s3://test-bucket/config${i}.json`),
  ],
};

/**
 * Reset all mocks and clear module cache for clean test isolation.
 */
export function resetTestEnvironment() {
  vi.resetAllMocks();
  vi.clearAllMocks();
  vi.resetModules();
}

/**
 * Wait for a specified number of milliseconds.
 * Useful for testing timing-dependent functionality.
 *
 * @param ms - The number of milliseconds to wait.
 * @returns A promise that resolves after the specified number of milliseconds.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a promise that can be resolved or rejected externally.
 * Useful for controlling async behavior in tests.
 *
 * @returns An object containing the promise and its resolve and reject functions.
 */
export function createControllablePromise<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}
