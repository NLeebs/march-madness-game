export interface TeamSchedule {
  team: string;
  conference: string;
}

export interface TeamSchedules {
  [week: string]: TeamSchedule[][];
}
