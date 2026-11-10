import type { Database } from "@/types/database";

type PublicFunctions = Database["public"]["Functions"];

/** Element type of the array a Postgres RPC function returns. */
export type RpcRow<F extends keyof PublicFunctions> =
  PublicFunctions[F]["Returns"] extends (infer Row)[] ? Row : never;
