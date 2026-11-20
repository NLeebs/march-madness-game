import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import type { TournamentField } from "@/src/functions/tournament/simulateTournament";
import { ValidationError } from "@/utils/errorHandling/AppError";

// Server-only: never import this from src/ or store/.

export interface FieldClaims {
  yearId: string;
  field: TournamentField;
}
export interface VerifiedField extends FieldClaims {
  issuedAt: number; // ms epoch
}

export const FIELD_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const FIELD_TOKEN_INVALID = "The tournament field is invalid or expired";

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MIN_SECRET_LENGTH = 32;

const teams = (n: number) => z.array(z.string()).length(n);

const PayloadSchema = z
  .object({
    v: z.literal(1),
    yearId: z.string().uuid(),
    field: z
      .object({
        tournamentTeams: teams(60),
        playinTeams: z
          .object({ elevenSeeds: teams(4), sixteenSeeds: teams(4) })
          .strict(),
      })
      .strict(),
    iat: z.number().int(),
  })
  .strict();

function resolveSecret(secret?: string): string {
  const s = secret ?? process.env.GAME_SIGNING_SECRET;
  if (!s || s.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `GAME_SIGNING_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  return s;
}

const mac = (secret: string, data: string) =>
  createHmac("sha256", secret).update(data).digest();

export function signFieldToken(
  claims: FieldClaims,
  opts: { now?: number; secret?: string } = {},
): string {
  const secret = resolveSecret(opts.secret);
  const iat = Math.floor((opts.now ?? Date.now()) / 1000);
  const payload = Buffer.from(
    JSON.stringify({ v: 1, yearId: claims.yearId, field: claims.field, iat }),
  ).toString("base64url");
  return `${payload}.${mac(secret, payload).toString("base64url")}`;
}

export function verifyFieldToken(
  token: string,
  opts: { now?: number; secret?: string } = {},
): VerifiedField {
  const secret = resolveSecret(opts.secret);
  const invalid = () => new ValidationError(FIELD_TOKEN_INVALID);

  if (typeof token !== "string") throw invalid();
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw invalid();
  const [payload, signature] = parts;

  const given = Buffer.from(signature, "base64url");
  const expected = mac(secret, payload);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw invalid();
  }

  let parsed: z.infer<typeof PayloadSchema>;
  try {
    parsed = PayloadSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
  } catch {
    throw invalid();
  }

  const now = opts.now ?? Date.now();
  const issuedAt = parsed.iat * 1000;
  if (issuedAt > now + MAX_FUTURE_SKEW_MS) throw invalid();
  if (now - issuedAt > FIELD_TOKEN_MAX_AGE_MS) throw invalid();

  return { yearId: parsed.yearId, field: parsed.field as TournamentField, issuedAt };
}
