"use client";
import { useCallback } from "react";
import { SignupFormData } from "@/src/formSchemas";
import { supabase } from "@/app/api/supabase";

interface IUseSignUp {
  addNewUserToDB: (formData: SignupFormData) => Promise<void>;
}

export const useSignUp = (): IUseSignUp => {
  const addNewUserToDB = useCallback(async (formData: SignupFormData) => {
    const { data: signupData, error: signupError } = await supabase.auth.signUp(
      {
        email: formData.email,
        password: formData.password,
      }
    );

    if (signupError) {
      throw new Error(signupError.message);
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: signupData.user?.id,
      username: formData.userName,
    });

    if (profileError) {
      throw profileError;
    }
  }, []);

  return { addNewUserToDB };
};
