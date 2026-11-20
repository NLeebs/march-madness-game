import { AppError } from "@/utils/errorHandling";

/** The parts of handleApiError's JSON body that say why a request failed. */
type ApiErrorReason = {
  message: string;
  code?: string;
  details?: { field: string; message: string }[];
};

/**
 * An AppError carrying the server's reason (message, code, failing fields), so
 * a crash report says why the server refused: "Failed to <action> (<status>
 * <code>): <message> [<field>: <message>; ...]". Tolerates a body that is not
 * handleApiError's JSON (e.g. a proxy's HTML page).
 */
export async function apiError(response: Response, action: string): Promise<AppError> {
  const reason = await readApiErrorReason(response);
  if (!reason) {
    return new AppError(`Failed to ${action} (${response.status})`, response.status);
  }
  const status = reason.code ? `${response.status} ${reason.code}` : `${response.status}`;
  const fields = reason.details?.length
    ? ` [${reason.details.map((d) => `${d.field}: ${d.message}`).join("; ")}]`
    : "";
  return new AppError(
    `Failed to ${action} (${status}): ${reason.message}${fields}`,
    response.status,
    true,
    reason.code
  );
}

async function readApiErrorReason(response: Response): Promise<ApiErrorReason | undefined> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return undefined;
  }
  if (typeof body !== "object" || body === null || !("error" in body)) return undefined;
  const error: unknown = body.error;
  if (typeof error !== "object" || error === null) return undefined;
  if (!("message" in error) || typeof error.message !== "string") return undefined;
  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  const details =
    "details" in error && Array.isArray(error.details)
      ? error.details.filter(isFieldDetail)
      : undefined;
  return { message: error.message, code, details };
}

function isFieldDetail(detail: unknown): detail is { field: string; message: string } {
  return (
    typeof detail === "object" &&
    detail !== null &&
    "field" in detail &&
    typeof detail.field === "string" &&
    "message" in detail &&
    typeof detail.message === "string"
  );
}
