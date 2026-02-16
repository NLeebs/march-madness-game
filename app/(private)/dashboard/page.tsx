"use client";
import React from "react";
import { NavigationBar, Dashboard } from "@/src/components";

const DashboardPage = () => {
  return (
    <>
      <NavigationBar />
      <main className="w-screen h-[calc(100vh-5rem)]">
        <Dashboard />
      </main>
    </>
  );
};

export default DashboardPage;
