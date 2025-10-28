import { z } from "zod";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_REGEX,
  HONEYPOT_FIELD_NAME,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_REGEX,
} from "@/src/constants/CONSTANTS";

export const signupFormSchema = z
  .object({
    userName: z
      .string()
      .min(USERNAME_MIN_LENGTH, "Username is required")
      .max(USERNAME_MAX_LENGTH, "Username must be less than 20 characters")
      .regex(USERNAME_REGEX, "Username can only contain letters and numbers"),
    email: z.string().email("Invalid email format"),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, "Password must be at least 8 characters")
      .max(PASSWORD_MAX_LENGTH, "Password must be less than 100 characters")
      .regex(
        PASSWORD_REGEX,
        "Password can only contain letters, numbers, and special characters"
      ),
    confirmPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, "Password must be at least 8 characters")
      .max(PASSWORD_MAX_LENGTH, "Password must be less than 100 characters")
      .regex(
        PASSWORD_REGEX,
        "Password can only contain letters, numbers, and special characters"
      ),
    [HONEYPOT_FIELD_NAME]: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignupFormData = z.infer<typeof signupFormSchema>;

export const signupFormDefaults: SignupFormData = {
  email: "",
  password: "",
  confirmPassword: "",
  [HONEYPOT_FIELD_NAME]: "",
};
