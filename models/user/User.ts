import { z } from "zod";

export const UserSchema = z.object({
  userName: z.string(),
  email: z.string(),
  password: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  favoriteTeam: z.string(),
  stats: z.object({
    wins: z.number(),
    losses: z.number(),
    ties: z.number(),
    pointsFor: z.number(),
    pointsAgainst: z.number(),
  }),
});
