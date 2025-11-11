"use client";
import { createContext, useState, useEffect } from "react";
import { supabase } from "@/app/api/supabase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUser(data?.session?.user || null);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error getting session:", error);
        setUser(null);
        setLoading(false);
      });

    const { data: listner } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      listner.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
