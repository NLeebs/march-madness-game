"use client";
import React from "react";
import { NavigationBar, Dashboard } from "@/src/components";

const DashboardPage = () => {
  return (
    <>
      <NavigationBar />
      <main className="w-full h-[calc(100vh-5rem)] overflow-y-scroll">
        <Dashboard />
      </main>
    </>
  );
};

export default DashboardPage;
