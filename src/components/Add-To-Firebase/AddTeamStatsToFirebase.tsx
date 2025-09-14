"use client";
import React from "react";
import pythonDataScrapeHandler from "@/src/functions/data-scraping/sendTeamStatsToFirebase";

export const AddTeamStatsToFirebase: React.FC = () => {
  return <button onClick={pythonDataScrapeHandler}>Add Team to FB</button>;
};
