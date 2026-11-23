// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { validateOrigin } from "@/utils/errorHandling/apiSecurity";
import { ValidationError } from "@/utils/errorHandling/AppError";

const ALLOWED = ["https://madnessgame.app"];

function request(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://madnessgame.app/api/season", { method: "POST", headers });
}

function expectRejected(check: () => void) {
  try {
    check();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe("INVALID_ORIGIN");
    return;
  }
  throw new Error("expected the origin to be rejected");
}

describe("validateOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts an allowed Origin", () => {
    expect(() => validateOrigin(ALLOWED)(request({ origin: "https://madnessgame.app" }))).not.toThrow();
  });

  it("accepts an Origin when the allowed entry has a trailing slash", () => {
    expect(() =>
      validateOrigin(["https://madnessgame.app/"])(request({ origin: "https://madnessgame.app" })),
    ).not.toThrow();
  });

  it.each(["https://madnessgame.app.evil.com", "http://madnessgame.app", "https://madnessgame.app:8443"])(
    "rejects the look-alike Origin %s",
    (origin) => {
      expectRejected(() => validateOrigin(ALLOWED)(request({ origin })));
    },
  );

  it("accepts a Referer from an allowed origin when there is no Origin", () => {
    expect(() =>
      validateOrigin(ALLOWED)(request({ referer: "https://madnessgame.app/some/page" })),
    ).not.toThrow();
  });

  it.each(["https://madnessgame.app.evil.com/x", "http://madnessgame.app/x", "https://madnessgame.app:8443/x"])(
    "rejects the look-alike Referer %s",
    (referer) => {
      expectRejected(() => validateOrigin(ALLOWED)(request({ referer })));
    },
  );

  it("rejects a foreign Origin even when the Referer is allowed", () => {
    expectRejected(() =>
      validateOrigin(ALLOWED)(
        request({ origin: "https://evil.example", referer: "https://madnessgame.app/page" }),
      ),
    );
  });

  it("rejects a request with neither header", () => {
    expectRejected(() => validateOrigin(ALLOWED)(request({})));
  });
});
