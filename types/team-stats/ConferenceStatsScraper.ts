import { TeamStatsScraper } from "./TeamStatsScraper";

export interface ConferenceStatsScraper {
  [conference: string]: TeamStatsScraper;
}

export type DeadConferenceStatsScraper = {};
