import { allStatURLsObjects } from "./Team-Stats-URL-Objects";

export const numberOfConferences = allStatURLsObjects.filter((obj) => {
  return obj && typeof obj === "object" && Object.keys(obj).length > 0;
}).length;
