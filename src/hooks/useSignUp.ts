"use client";
import { useCallback } from "react";
import { SignupFormData } from "@/src/formSchemas";
import { supabase } from "@/app/api/supabase";

interface IUseSignUpReturn {
  success: boolean;
  error: string | null;
}

interface IUseSignUp {
  addNewUserToDB: (formData: SignupFormData) => Promise<IUseSignUpReturn>;
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
      return { success: false, error: signupError.message };
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: signupData.user?.id,
      username: formData.userName,
    });

    if (profileError) {
      throw profileError;
      return { success: false, error: profileError.message };
    }

    return { success: true, error: null };
  }, []);

  return { addNewUserToDB };
};
