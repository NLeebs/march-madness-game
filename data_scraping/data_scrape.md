# How to get Team Stats for Particular Yearj

## Check Conference Realignment

Check the current conferences and their teams at [Fox Sports Conferences](https://www.foxsports.com/college-basketball/conferences).
Do this for each conference in the `.\src\components\Team-Stats-URL-Objects` folder and switch teams if necessary.

## Add Conference Data to Firebase

You can add conference data using the `firstHalfConfURLsArr`, `secondHalfConfURLsArr`, or `testURLArr` variables.
It is recommended to add the conferences in halfs but you can add one at a time due to site rate limiting and better error handling.
Use the half conference variables or add the correct conference array to the testURLArr vaiable:

```
const testURLArr: [string, ConferenceStatsScraper][] = [["wcc", wccStatURLs]];
```

This line will add conference stats for the WCC conference. Reference the other vaiables for the correct arrays.

## Run Data Scrape File

Start the scrape with `npm run scrape:team-stats`.

Error handling will show if any team names, websites, colors, or other information has changed or is unavalibale.
Edit the teams in the `.\src\components\Team-Stats-URL-Objects` folder with any updated information.

## Run Supabase Migration Script

Once your team stats are in firebase successfully. Run the forebaseTpSupabaseTeamMigration script to add the new year to Supabase.
Use the npm command below to execute:

```
npm run migrate:teams-firebase-to-supabase
```

## Play some Games!

You're good to go.
