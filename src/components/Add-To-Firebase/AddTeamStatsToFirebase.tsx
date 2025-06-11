"use client";
import React from "react";
import pythonDataScrapeHandler from "@/src/functions/data-scraping/sendTeamStatsToFirebase";

interface TeamColorData {
  [key: string]: {
    "team-colors-URL": string;
  };
}

// Test Data
const colorTestData: TeamColorData = {
  Illinois: {
    "team-colors-URL":
      "https://teamcolorcodes.com/illinois-fighting-illini-colors/",
  },
  Indiana: {
    "team-colors-URL":
      "https://teamcolorcodes.com/indiana-hoosiers-color-codes/",
  },
  Iowa: {
    "team-colors-URL": "https://teamcolorcodes.com/iowa-hawkeyes-color-codes/",
  },
  Maryland: {
    "team-colors-URL":
      "https://teamcolorcodes.com/maryland-terrapins-color-codes/",
  },
  Michigan: {
    "team-colors-URL":
      "https://teamcolorcodes.com/michigan-wolverines-color-codes/",
  },
  "Michigan State": {
    "team-colors-URL":
      "https://teamcolorcodes.com/michigan-state-spartans-colors/",
  },
  Minnesota: {
    "team-colors-URL":
      "https://teamcolorcodes.com/minnesota-golden-gophers-colors/",
  },
  Nebraska: {
    "team-colors-URL":
      "https://teamcolorcodes.com/nebraska-cornhuskers-colors/",
  },
  Northwestern: {
    "team-colors-URL":
      "https://teamcolorcodes.com/northwestern-wildcats-color-codes/",
  },
  "Ohio State": {
    "team-colors-URL":
      "https://teamcolorcodes.com/ohio-state-buckeyes-color-codes/",
  },
  "Penn State": {
    "team-colors-URL":
      "https://teamcolorcodes.com/penn-state-nittany-lions-color-codes/",
  },
  Purdue: {
    "team-colors-URL": "https://teamcolorcodes.com/purdue-boilermakers-colors/",
  },
  Rutgers: {
    "team-colors-URL":
      "https://teamcolorcodes.com/rutgers-scarlet-knights-colors/",
  },
  Wisconsin: {
    "team-colors-URL": "https://teamcolorcodes.com/wisconsin-badgers-colors/",
  },
};

// Test Handler for new color website
const testHandler = async (
  e: React.MouseEvent<HTMLButtonElement>
): Promise<void> => {
  e.preventDefault();

  const testRes = await fetch("http://127.0.0.1:5000/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(colorTestData),
  });
  if (testRes.ok) {
    console.log(testRes);
  } else {
    alert(testRes.statusText);
  }
};

// Component Function
export const AddTeamStatsToFirebase: React.FC = () => {
  return <button onClick={pythonDataScrapeHandler}>Add Team to FB</button>;
};
