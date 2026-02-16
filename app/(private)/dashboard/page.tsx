"use client";
import React from "react";
import { NavigationBar, Dashboard } from "@/src/components";

const DashboardPage = () => {
  return (
    <>
      <NavigationBar />
      <div className="flex items-center justify-center min-w-full min-h-screen">
        <Dashboard />
      </div>
    </>
  );
};

export default DashboardPage;
