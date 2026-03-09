import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";
import { spawn } from "child_process";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as conferenceMapModule from "../../models/teamData/ConferenceMap";
import * as teamStatURLObjects from "../../src/components/Add-To-Firebase/Team-Stats-URL-Objects";
import type { ConferenceStatsScraper } from "../../types/team-stats/ConferenceStatsScraper";
import type { TeamStatsScraper } from "../../types/team-stats/TeamStatsScraper";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");

config({ path: resolve(projectRoot, ".env") });
config({ path: resolve(projectRoot, ".env.local") });

const requiredFirebaseEnvVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
];

const missingFirebaseVars = requiredFirebaseEnvVars.filter(
  (varName) => !process.env[varName],
);

if (missingFirebaseVars.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingFirebaseVars.join(
      ", ",
    )}`,
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const firebaseDb = getFirestore(firebaseApp);

const conferenceMapExports =
  (conferenceMapModule as { default?: typeof conferenceMapModule }).default ??
  conferenceMapModule;
const ConferenceSubmissionSchema =
  conferenceMapExports.ConferenceSubmissionSchema;
const teamStatURLExports =
  (teamStatURLObjects as { default?: typeof teamStatURLObjects }).default ??
  teamStatURLObjects;
const {
  accStatURLs,
  americaEastStatURLs,
  americanAthleticStatURLs,
  asunStatURLs,
  atlantic10StatURLs,
  big12StatURLs,
  bigEastStatURLs,
  bigSkyStatURLs,
  bigSouthStatURLs,
  bigTenStatURLs,
  bigWestStatURLs,
  caaStatURLs,
  cusaStatURLs,
  horizonStatURLs,
  ivyStatURLs,
  maacStatURLs,
  macStatURLs,
  meacStatURLs,
  missouriValleyStatURLs,
  mountainWestStatURLs,
  necStatURLs,
  ohioValleyStatURLs,
  patriotStatURLs,
  secStatURLs,
  southernStatURLs,
  southlandStatURLs,
  summitStatURLs,
  sunBeltStatURLs,
  swacStatURLs,
  wacStatURLs,
  wccStatURLs,
} = teamStatURLExports;

const runPythonConferenceScrape = async (
  conferenceData: ConferenceStatsScraper,
): Promise<TeamStatsScraper[]> => {
  const scriptPath = resolve(
    projectRoot,
    "data_scraping",
    "ncaa_team_stats_scrape.py",
  );
  const venvPythonPath = resolve(
    projectRoot,
    "data_scraping",
    "myenv",
    "Scripts",
    "python.exe",
  );
  const pythonExecutable = existsSync(venvPythonPath)
    ? venvPythonPath
    : "python";
  const pythonProcess = spawn(pythonExecutable, [scriptPath, "--stdin-json"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  pythonProcess.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  pythonProcess.stderr.on("data", (chunk) => {
    const stderrChunk = chunk.toString();
    stderr += stderrChunk;
    process.stderr.write(`[python] ${stderrChunk}`);
  });

  pythonProcess.stdin.write(JSON.stringify(conferenceData));
  pythonProcess.stdin.end();

  const exitCode = await new Promise((resolvePromise, rejectPromise) => {
    pythonProcess.on("error", rejectPromise);
    pythonProcess.on("close", resolvePromise);
  });

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `Python exited with code ${exitCode}`);
  }

  return JSON.parse(stdout) as TeamStatsScraper[];
};

const pythonDataScrapeHandler = async () => {
  const firstHalfConfURLsArr: [string, ConferenceStatsScraper][] = [
    ["acc", accStatURLs],
    ["americaEast", americaEastStatURLs],
    ["americanAthletic", americanAthleticStatURLs],
    ["asun", asunStatURLs],
    ["atlantic10", atlantic10StatURLs],
    ["big12", big12StatURLs],
    ["bigEast", bigEastStatURLs],
    ["bigSky", bigSkyStatURLs],
    ["bigSouth", bigSouthStatURLs],
    ["bigTen", bigTenStatURLs],
    ["bigWest", bigWestStatURLs],
    ["caa", caaStatURLs],
    ["cusa", cusaStatURLs],
    ["horizon", horizonStatURLs],
    ["ivy", ivyStatURLs],
  ];
  const secondHalfConfURLsArr: [string, ConferenceStatsScraper][] = [
    ["maac", maacStatURLs],
    ["mac", macStatURLs],
    ["meac", meacStatURLs],
    ["missouriValley", missouriValleyStatURLs],
    ["mountainWest", mountainWestStatURLs],
    ["nec", necStatURLs],
    ["ohioValley", ohioValleyStatURLs],
    ["patriot", patriotStatURLs],
    ["sec", secStatURLs],
    ["southern", southernStatURLs],
    ["southland", southlandStatURLs],
    ["summit", summitStatURLs],
    ["sunBelt", sunBeltStatURLs],
    ["swac", swacStatURLs],
    ["wac", wacStatURLs],
    ["wcc", wccStatURLs],
  ];

  const testURLArr: [string, ConferenceStatsScraper][] = [
    ["summit", summitStatURLs],
    ["sunBelt", sunBeltStatURLs],
    ["swac", swacStatURLs],
    ["wac", wacStatURLs],
    ["wcc", wccStatURLs],
  ];

  const conferenceSubmission: ConferenceStatsScraper = {};
  // Change conference URLs here //
  testURLArr.forEach((teamArr) => {
    conferenceSubmission[teamArr[0]] = {} as TeamStatsScraper;
  });

  await Promise.all(
    // Change conference URLs here //
    testURLArr.map(async (confData) => {
      try {
        const postData = await runPythonConferenceScrape(confData[1]);
        postData.forEach((obj: TeamStatsScraper) => {
          conferenceSubmission[confData[0]][Object.keys(obj)[0]] =
            obj[Object.keys(obj)[0]];
        });
      } catch (err) {
        throw new Error(
          `${confData[0]} has errored out! ${err instanceof Error ? err.message : ""}`,
        );
      }
    }),
  );

  try {
    // Validate data structure before parsing
    if (!conferenceSubmission || typeof conferenceSubmission !== "object") {
      throw new Error("Invalid conference submission data structure");
    }

    // Parse and validate the data against the schema
    const parsedConferenceSubmission =
      ConferenceSubmissionSchema.parse(conferenceSubmission);

    // Add item to database
    const currentYear = new Date().getFullYear();
    const statsRef = doc(firebaseDb, "team-statistics", `${currentYear}`);
    await setDoc(statsRef, parsedConferenceSubmission, { merge: true });
  } catch (error) {
    if (error.name === "ZodError") {
      console.error("Schema validation failed:", error.errors);
      throw new Error(
        "Data validation failed: " +
          error.errors.map((e) => e.message).join(", "),
      );
    }
    throw error;
  }
};

pythonDataScrapeHandler()
  .then(() => {
    console.log("Team stats scrape complete.");
  })
  .catch((error) => {
    console.error("Team stats scrape failed:", error);
    process.exit(1);
  });
