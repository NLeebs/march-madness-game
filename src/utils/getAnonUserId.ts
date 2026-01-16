import { v4 as uuid } from "uuid";

export function getAnonUserId(): string {
  const key = process.env.NEXT_PUBLIC_BROWSER_ANON_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_ANON_USER_ID_KEY is not set");
  }

  let anonId = localStorage.getItem(key);

  if (!anonId) {
    anonId = uuid();
    localStorage.setItem(key, anonId);
  }

  return anonId;
}
