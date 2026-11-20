import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockCaptureException = vi.fn();

vi.mock("@/infrastructure/db/supabaseServer", () => ({
  createSupabaseServerClient: () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

import { getSessionUserId } from "@/utils/api/getSessionUserId";

const USER_ID = "44444444-4444-4444-8444-444444444444";
const authError = (status: number | undefined, message = "auth error") =>
  Object.assign(new Error(message), { status, __isAuthError: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSessionUserId", () => {
  it("returns the signed-in user's id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });

    expect(await getSessionUserId()).toBe(USER_ID);
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    ["no session", 400],
    ["an expired or invalid token", 401],
    ["a deleted user", 403],
  ])("treats %s as logged out without reporting it", async (_case, status) => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: authError(status) });

    expect(await getSessionUserId()).toBeNull();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    ["an Auth server error", authError(503)],
    ["a network error", authError(0)],
    ["an error without a status", authError(undefined)],
  ])("falls back to logged out on %s and reports it", async (_case, error) => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error });

    expect(await getSessionUserId()).toBeNull();
    expect(mockCaptureException).toHaveBeenCalledWith(error, expect.anything());
  });

  it("falls back to logged out when getUser throws, and reports it", async () => {
    const error = new Error("boom");
    mockGetUser.mockRejectedValue(error);

    expect(await getSessionUserId()).toBeNull();
    expect(mockCaptureException).toHaveBeenCalledWith(error, expect.anything());
  });
});
