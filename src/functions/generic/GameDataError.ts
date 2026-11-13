/**
 * Thrown by game logic when its input data is malformed (a team without a
 * record, a conference that is too small...). `details` names the bad data so
 * crash reports can show it as fields.
 */
export class GameDataError extends Error {
  readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.name = "GameDataError";
    this.details = details;
    Object.setPrototypeOf(this, GameDataError.prototype);
  }
}
