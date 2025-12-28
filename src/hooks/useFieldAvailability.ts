"use client";
import { useState, useCallback } from "react";
import { supabase } from "@/app/api/supabase";

interface UseFieldAvailabilityReturn {
  checkUsernameAvailability: (value: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export const useFieldAvailability = (): UseFieldAvailabilityReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUsernameAvailability = useCallback(
    async (value: string): Promise<boolean> => {
      if (!value || value.trim().length === 0) {
        setError(null);
        return true;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", value.trim())
          .maybeSingle();

        if (queryError) {
          if (queryError.code === "PGRST116") {
            setIsLoading(false);
            return true;
          }
          throw queryError;
        }

        setIsLoading(false);
        if (data) {
          setError("Username is already taken");
          return false;
        }
        return true;
      } catch (err) {
        setIsLoading(false);
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        return false;
      }
    },
    []
  );

  return { checkUsernameAvailability, isLoading, error };
};
