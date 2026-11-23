import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  FIELD_TOKEN_INVALID,
  FIELD_TOKEN_MAX_AGE_MS,
  signFieldToken,
  verifyFieldToken,
  type FieldClaims,
} from "@/utils/api/fieldToken";
import { ValidationError } from "@/utils/errorHandling/AppError";

const SECRET = "unit-test-secret-unit-test-secret-0123456789";
const NOW = 1_800_000_000_000;
const YEAR_ID = "44444444-4444-4444-8444-444444444444";

const names = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${prefix} ${i}`);

const claims: FieldClaims = {
  yearId: YEAR_ID,
  field: {
    tournamentTeams: names("Team", 60),
    playinTeams: {
      elevenSeeds: names("Eleven", 4),
      sixteenSeeds: names("Sixteen", 4),
    },
  },
};

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (payload: string, secret = SECRET) =>
  createHmac("sha256", secret).update(payload).digest("base64url");
const forge = (obj: unknown, secret = SECRET) => {
  const p = b64(JSON.stringify(obj));
  return `${p}.${sign(p, secret)}`;
};
const iatSec = (ms: number) => Math.floor(ms / 1000);

const rejects = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ValidationError);
    expect((e as Error).message).toBe(FIELD_TOKEN_INVALID);
    return;
  }
  throw new Error("expected rejection");
};

describe("fieldToken", () => {
  it("round trip returns yearId, field and issuedAt", () => {
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    const v = verifyFieldToken(t, { now: NOW, secret: SECRET });
    expect(v.yearId).toBe(YEAR_ID);
    expect(v.field).toEqual(claims.field);
    expect(v.issuedAt).toBe(iatSec(NOW) * 1000);
  });

  it("uses the env secret by default", () => {
    const t = signFieldToken(claims);
    expect(verifyFieldToken(t).yearId).toBe(YEAR_ID);
  });

  it("tampered payload", () => {
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    const [p, s] = t.split(".");
    const obj = JSON.parse(Buffer.from(p, "base64url").toString());
    obj.field.tournamentTeams[0] = "Cheater U";
    const bad = `${b64(JSON.stringify(obj))}.${s}`;
    rejects(() => verifyFieldToken(bad, { now: NOW, secret: SECRET }));
  });

  it("tampered signature", () => {
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    const [p, s] = t.split(".");
    const flipped = (s[0] === "A" ? "B" : "A") + s.slice(1);
    rejects(() => verifyFieldToken(`${p}.${flipped}`, { now: NOW, secret: SECRET }));
    rejects(() => verifyFieldToken(`${p}.${s.slice(1)}`, { now: NOW, secret: SECRET }));
  });

  it("wrong secret", () => {
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    rejects(() => verifyFieldToken(t, { now: NOW, secret: SECRET + "x" }));
  });

  it("malformed", () => {
    for (const bad of ["", "abc", "a.b.c"]) {
      rejects(() => verifyFieldToken(bad, { now: NOW, secret: SECRET }));
    }
    const p = b64("not json");
    rejects(() =>
      verifyFieldToken(`${p}.${sign(p)}`, { now: NOW, secret: SECRET }),
    );
  });

  it("wrong version", () => {
    const t = forge({ v: 2, ...claims, iat: iatSec(NOW) });
    rejects(() => verifyFieldToken(t, { now: NOW, secret: SECRET }));
  });

  it("rejects a correctly signed but badly shaped payload", () => {
    const t = forge({
      v: 1,
      yearId: YEAR_ID,
      field: { ...claims.field, tournamentTeams: names("T", 59) },
      iat: iatSec(NOW),
    });
    rejects(() => verifyFieldToken(t, { now: NOW, secret: SECRET }));
  });

  it("expired", () => {
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    const iat = iatSec(NOW) * 1000;
    rejects(() =>
      verifyFieldToken(t, { now: iat + FIELD_TOKEN_MAX_AGE_MS + 1000, secret: SECRET }),
    );
    expect(() =>
      verifyFieldToken(t, { now: iat + FIELD_TOKEN_MAX_AGE_MS - 1000, secret: SECRET }),
    ).not.toThrow();
  });

  it("future iat", () => {
    const min = 60 * 1000;
    const far = signFieldToken(claims, { now: NOW + 6 * min, secret: SECRET });
    rejects(() => verifyFieldToken(far, { now: NOW, secret: SECRET }));
    const near = signFieldToken(claims, { now: NOW + 4 * min, secret: SECRET });
    expect(() => verifyFieldToken(near, { now: NOW, secret: SECRET })).not.toThrow();
  });

  it("accepts exactly the expiry and future-skew edges", () => {
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    expect(
      verifyFieldToken(t, { now: NOW + FIELD_TOKEN_MAX_AGE_MS, secret: SECRET }).yearId,
    ).toBe(YEAR_ID);
    const edge = signFieldToken(claims, { now: NOW + 5 * 60 * 1000, secret: SECRET });
    expect(verifyFieldToken(edge, { now: NOW, secret: SECRET }).yearId).toBe(YEAR_ID);
  });

  it("rejects non-canonical signature encodings", () => {
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    const [p, s] = t.split(".");
    rejects(() => verifyFieldToken(`${p}.${s}A`, { now: NOW, secret: SECRET }));
    rejects(() => verifyFieldToken(`${p}.${s.slice(0, 10)}*${s.slice(11)}`, { now: NOW, secret: SECRET }));
    rejects(() => verifyFieldToken(`${p}.${s}=`, { now: NOW, secret: SECRET }));
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    for (const c of alphabet) {
      if (c === s[42]) continue;
      rejects(() => verifyFieldToken(`${p}.${s.slice(0, 42)}${c}`, { now: NOW, secret: SECRET }));
    }
  });

  it("missing secret throws a plain Error, not ValidationError", () => {
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    for (const secret of ["", undefined]) {
      const run = () => {
        const prev = process.env.GAME_SIGNING_SECRET;
        delete process.env.GAME_SIGNING_SECRET;
        try {
          return verifyFieldToken(t, { now: NOW, secret });
        } finally {
          process.env.GAME_SIGNING_SECRET = prev;
        }
      };
      expect(run).toThrow(Error);
      expect(run).not.toThrow(ValidationError);
    }
    expect(() => signFieldToken(claims, { secret: "" })).toThrow(Error);
  });

  it("31-character secret throws a plain Error", () => {
    const short = "x".repeat(31);
    expect(() => signFieldToken(claims, { secret: short })).toThrow(Error);
    expect(() => signFieldToken(claims, { secret: short })).not.toThrow(ValidationError);
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    expect(() => verifyFieldToken(t, { secret: short })).not.toThrow(ValidationError);
    expect(() => verifyFieldToken(t, { secret: short })).toThrow(Error);
  });

  it("token never contains the secret", () => {
    const t = signFieldToken(claims, { now: NOW, secret: SECRET });
    expect(t.includes(SECRET)).toBe(false);
    expect(Buffer.from(t.split(".")[0], "base64url").toString().includes(SECRET)).toBe(false);
  });
});
