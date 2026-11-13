// @vitest-environment node
import { describe, it, expect, afterAll } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { POST } from "@/app/sentry-tunnel/route";

const OUR_DSN = "https://ours@o111.ingest.sentry.io/222";
const FOREIGN_DSN = "https://abc@o999.ingest.sentry.io/123";

function envelopeFor(dsn: string): Request {
  const body = [
    JSON.stringify({ dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify({ message: "relay attempt" }),
  ].join("\n");
  return new Request("http://localhost/monitoring", {
    method: "POST",
    body,
    headers: { "content-length": String(new TextEncoder().encode(body).length) },
  });
}

describe("app/sentry-tunnel/route.ts", () => {
  afterAll(async () => {
    await Sentry.close();
  });

  it("forwards nothing while Sentry is off (no DSN)", async () => {
    const response = await POST(envelopeFor(FOREIGN_DSN));
    expect(response.ok).toBe(false);
  });

  it("refuses an envelope for a Sentry project that is not ours", async () => {
    Sentry.init({ dsn: OUR_DSN, defaultIntegrations: false });
    const response = await POST(envelopeFor(FOREIGN_DSN));
    expect(response.status).toBe(403);
  });
});
