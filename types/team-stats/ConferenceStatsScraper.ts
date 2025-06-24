import { TeamStatsScraper } from "./TeamStatsScraper";

export interface ConferenceStatsScraper {
  [key: string]: TeamStatsScraper;
}

export type DeadConferenceStatsScraper = {};
