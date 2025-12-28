"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useForm, SubmitHandler, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  signupFormSchema,
  signupFormDefaults,
  SignupFormData,
} from "@/src/formSchemas";
import { useSignUp, useFieldAvailability } from "@/src/hooks";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  FormField,
  ProtectedForm,
  SubmitButton,
} from "@/src/components";

type FieldValidationState = {
  isValidating: boolean;
  isValid: boolean;
};

export const SignupForm = () => {
  const { addNewUserToDB } = useSignUp();
  const { checkUsernameAvailability } = useFieldAvailability();

  const [usernameValidation, setUsernameValidation] =
    useState<FieldValidationState>({
      isValidating: false,
      isValid: false,
    });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    mode: "onBlur",
    defaultValues: signupFormDefaults,
  });

  const { control, formState } = signupForm;
  const userNameValue = useWatch({ control, name: "userName" });
  const prevUserNameRef = useRef<string | undefined>(userNameValue);
  const hasErrors = Object.keys(formState.errors).length > 0;

  useEffect(() => {
    if (prevUserNameRef.current !== userNameValue) {
      prevUserNameRef.current = userNameValue;
      setUsernameValidation({ isValidating: false, isValid: false });
    }
  }, [userNameValue]);

  const handleSignup: SubmitHandler<SignupFormData> = async (data) => {
    const { error } = await addNewUserToDB(data);
    if (error) {
      signupForm.setError("root", {
        type: "manual",
        message: error,
      });
    }
  };

  const handleUsernameBlur = useCallback(
    async (value: string) => {
      if (!value || value.trim().length === 0) {
        setUsernameValidation({ isValidating: false, isValid: false });
        return;
      }

      setUsernameValidation({ isValidating: true, isValid: false });
      const isAvailable = await checkUsernameAvailability(value);

      if (isAvailable) {
        setUsernameValidation({ isValidating: false, isValid: true });
        signupForm.clearErrors("userName");
      } else {
        setUsernameValidation({ isValidating: false, isValid: false });
        signupForm.setError("userName", {
          type: "manual",
          message: "Username is already taken",
        });
      }
    },
    [checkUsernameAvailability, signupForm]
  );

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Signup</CardTitle>
          <CardDescription>
            Enter a username, email and password to start hoopin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProtectedForm control={control} onSubmit={handleSignup}>
            <FormField
              control={control}
              name="userName"
              label="Username"
              type="text"
              required
              isValidating={usernameValidation.isValidating}
              isValid={usernameValidation.isValid}
              onBlur={(e) => handleUsernameBlur(e.target.value)}
            />

            <FormField
              control={control}
              name="email"
              label="Email"
              type="email"
              required
            />

            <FormField
              control={control}
              name="password"
              label="Password"
              type="password"
              required
            />

            <FormField
              control={control}
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              required
            />

            <div className="pt-4 w-full flex justify-center">
              <SubmitButton
                text="Signup"
                submittingText="Signing up..."
                disabled={hasErrors}
              />
            </div>
          </ProtectedForm>
        </CardContent>
      </Card>
    </div>
  );
};
