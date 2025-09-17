import { describe, it, expect } from "vitest";
import { KmsError, AwsErrorCodes } from "../../src/aws";

describe("aws/kms: KmsError static helpers", () => {
  it("keyNotFound", () => {
    const e = KmsError.keyNotFound();
    expect(e.code).toBe(AwsErrorCodes.KMS.KEY_NOT_FOUND);
    expect(e.status).toBe(404);
  });

  it("invalidCiphertext, throttling, accessDenied, internal", () => {
    expect(KmsError.invalidCiphertext().code).toBe(AwsErrorCodes.KMS.INVALID_CIPHERTEXT);
    expect(KmsError.throttling().code).toBe(AwsErrorCodes.KMS.THROTTLING);
    expect(KmsError.accessDenied().code).toBe(AwsErrorCodes.KMS.ACCESS_DENIED);
    expect(KmsError.internal().code).toBe(AwsErrorCodes.KMS.INTERNAL_ERROR);
  });
});
