import { describe, it, expect } from "vitest";
import { SecretsManagerError, AwsErrorCodes } from "../../src/aws";

describe("aws/secrets-manager: SecretsManagerError static helpers", () => {
  it("secretNotFound", () => {
    const e = SecretsManagerError.secretNotFound();
    expect(e.code).toBe(AwsErrorCodes.SecretsManager.SECRET_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("decryptionFailure", () => {
    const e = SecretsManagerError.decryptionFailure();
    expect(e.code).toBe(AwsErrorCodes.SecretsManager.DECRYPTION_FAILURE);
    expect(e.status).toBe(500);
  });

  it("throttling, accessDenied, validation, internal", () => {
    expect(SecretsManagerError.throttling().code).toBe(AwsErrorCodes.SecretsManager.THROTTLING);
    expect(SecretsManagerError.accessDenied().code).toBe(
      AwsErrorCodes.SecretsManager.ACCESS_DENIED,
    );
    expect(SecretsManagerError.validation().code).toBe(
      AwsErrorCodes.SecretsManager.VALIDATION_ERROR,
    );
    expect(SecretsManagerError.internal().code).toBe(AwsErrorCodes.SecretsManager.INTERNAL_ERROR);
  });
});
