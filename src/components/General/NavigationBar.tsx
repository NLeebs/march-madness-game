"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/api/supabase";
import { useAuth } from "@/src/hooks";
import { Button, Dialog, UserAuthentication } from "@/src/components";

export const NavigationBar = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) setIsLoginDialogOpen(false);
  }, [user]);

  const handleLogin = () => {
    setIsLoginDialogOpen(true);
  };

  const handleLogout = async () => {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      console.error("Error logging out:", logoutError);
      throw new Error(logoutError.message);
    }
  };

  return (
    <>
      <div className="w-full flex flex-row justify-between items-center bg-primary">
        <Button
          onClick={handleLogin}
          backgroundColor="bg-blue-500"
          text="Login"
        />
        <Button
          onClick={handleLogout}
          backgroundColor="bg-blue-500"
          text="Logout"
        />
      </div>
      <Dialog
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
        backgroundColor="#FFF"
      >
        <UserAuthentication />
      </Dialog>
    </>
  );
};
