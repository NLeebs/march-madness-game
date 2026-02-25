import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const conferenceNameMap = {
  acc: "ACC",
  americaEast: "America East",
  americanAthletic: "American Athletic",
  asun: "ASUN",
  atlantic10: "Atlantic 10",
  big12: "Big 12",
  bigEast: "Big East",
  bigSky: "Big Sky",
  bigSouth: "Big South",
  bigTen: "Big Ten",
  bigWest: "Big West",
  caa: "CAA",
  cusa: "CUSA",
  horizon: "Horizon",
  ivy: "Ivy League",
  maac: "MAAC",
  mac: "MAC",
  meac: "MEAC",
  missouriValley: "Missouri Valley",
  mountainWest: "Mountain West",
  nec: "NEC",
  ohioValley: "Ohio Valley",
  pac12: "Pac 12",
  patriot: "Patriot",
  sec: "SEC",
  southern: "Southern",
  southland: "Southland",
  summit: "Summit League",
  sunBelt: "Sun Belt",
  swac: "SWAC",
  wac: "WAC",
  wcc: "WCC",
};

const getSupabaseConference = async (firebaseConferenceName) => {
  const supabaseConferenceName = conferenceNameMap[firebaseConferenceName];

  if (!supabaseConferenceName) {
    console.warn(
      `  ⚠️  No mapping found for Firebase conference: ${firebaseConferenceName}`,
    );
    return null;
  }

  const { data, error } = await supabase
    .from("conferences")
    .select("id, conference")
    .eq("conference", supabaseConferenceName)
    .single();

  if (error || !data) {
    console.error(
      `  ❌ Error fetching conference "${supabaseConferenceName}":`,
      error?.message || "Not found",
    );
    return null;
  }

  return {
    id: data.id,
    name: data.conference,
  };
};

const migrateTeamData = async () => {
  try {
    console.log("Starting migration for all years...");

    const teamStatsCollection = collection(firebaseDb, "team-statistics");
    const teamStatsSnapshot = await getDocs(teamStatsCollection);

    if (teamStatsSnapshot.empty) {
      throw new Error("No team statistics data found in Firebase");
    }

    for (const yearDoc of teamStatsSnapshot.docs) {
      const firebaseYear = yearDoc.id;
      const { data: supabaseYearData, error } = await supabase
        .from("years")
        .select("id, year")
        .eq("year", firebaseYear)
        .single();

      if (error) {
        throw new Error("Error fetching year data from Supabase");
      }

      const yearData = yearDoc.data();
      console.log(
        `Processing year ${supabaseYearData.year}... ${supabaseYearData.id}`,
      );

      for (const [firebaseConferenceName, conferenceData] of Object.entries(
        yearData,
      )) {
        console.log(`  Processing conference: ${firebaseConferenceName}`);

        const supabaseConference = await getSupabaseConference(
          firebaseConferenceName,
        );

        if (!supabaseConference) {
          console.warn(
            `  ⚠️  Skipping conference ${firebaseConferenceName} - could not find in Supabase`,
          );
          continue;
        }

        for (const [firebaseTeamName, teamData] of Object.entries(
          conferenceData,
        )) {
          const { data, error } = await supabase.from("teams").upsert(
            {
              conference_id: supabaseConference.id,
              year_id: supabaseYearData.id,
              name: firebaseTeamName,
              team_logo: teamData.logo,
            },
            { onConflict: ["name", "conference_id", "year_id"] },
          );

          if (error) {
            console.error(
              `    ❌ Error upserting team "${firebaseTeamName}":`,
              error.message,
            );
          }
        }
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateTeamData();
