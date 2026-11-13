import { describe, it, expect } from "vitest";
import { sentryInitOptions } from "@/src/utils/crashReporting/sentryInitOptions";

describe("sentryInitOptions", () => {
  it("returns undefined when there is no DSN, so Sentry stays off", () => {
    expect(sentryInitOptions(undefined, "production")).toBeUndefined();
    expect(sentryInitOptions("", "production")).toBeUndefined();
  });

  it("collects no personal or request data and no traces", () => {
    const options = sentryInitOptions("https://key@o1.ingest.sentry.io/1", "preview");
    expect(options).toEqual({
      dsn: "https://key@o1.ingest.sentry.io/1",
      environment: "preview",
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
      },
    });
    expect(options).not.toHaveProperty("tracesSampleRate");
  });
});
