"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/infrastructure/db/supabaseClient";
import { useAuth } from "@/src/hooks";
import {
  BasketballSVG,
  Button,
  Dialog,
  UserAuthentication,
} from "@/src/components";
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/src/constants";

export const NavigationBar = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [openedTab, setOpenedTab] = useState<"login" | "signup">("login");

  useEffect(() => {
    if (user) setIsLoginDialogOpen(false);
  }, [user]);

  const handleHomeClick = () => {
    router.push("/");
  };

  const handleLogin = () => {
    setOpenedTab("login");
    setIsLoginDialogOpen(true);
  };

  const handleSignup = () => {
    setOpenedTab("signup");
    setIsLoginDialogOpen(true);
  };

  const handleLogout = async () => {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      console.error("Error logging out:", logoutError);
      throw new Error(logoutError.message);
    }
  };

  const homeButtonText = (
    <span className="text-2xl">
      Madness <span className="sm:inline hidden">the Game</span>
    </span>
  );

  const homeIcon = (
    <BasketballSVG
      size={36}
      seamColor={SECONDARY_COLOR}
      basketballColor={PRIMARY_COLOR}
    />
  );

  return (
    <>
      <nav className="w-full h-20 flex flex-row justify-between items-center px-4 bg-gradient-to-r from-blue-500 from-70% to-blue-400 to-100% py-1">
        <div className="flex flex-row items-center gap-2">
          <Button
            onClick={handleHomeClick}
            backgroundColor="transparent"
            text={homeButtonText}
            className="pl-0 text-2xl hover:scale-none"
            icon={homeIcon}
          />
        </div>
        {user ? (
          <div className="flex flex-row items-center gap-2">
            <Button
              onClick={handleLogout}
              backgroundColor="transparent"
              text="Logout"
            />
          </div>
        ) : (
          <div className="flex flex-row items-center gap-2">
            <Button
              onClick={handleLogin}
              backgroundColor="transparent"
              text="Login"
              className="p-4"
            />
            <Button
              onClick={handleSignup}
              backgroundColor={PRIMARY_COLOR}
              text="Signup"
              className="p-4"
            />
          </div>
        )}
      </nav>
      <Dialog
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
        dialogBackgroundColor="transparent"
        dialogBorderColor="transparent"
        hasCloseButton={false}
        overlayOpacity={0.8}
      >
        <UserAuthentication openedTab={openedTab} />
      </Dialog>
    </>
  );
};
