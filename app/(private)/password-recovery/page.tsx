"use client";
import React from "react";
import { PasswordRecoveryForm } from "@/src/components";
import { NavigationBar } from "@/src/components/General/NavigationBar";

const PasswordRecoveryPage = () => {
  return (
    <>
      <NavigationBar />
      <div className="flex items-center justify-center min-w-full min-h-screen">
        <PasswordRecoveryForm />
      </div>
    </>
  );
};

export default PasswordRecoveryPage;
