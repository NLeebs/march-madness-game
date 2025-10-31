import { z } from "zod";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_REGEX,
  HONEYPOT_FIELD_NAME,
} from "@/src/constants/CONSTANTS";

export const passwordRecoveryFormSchema = z
  .object({
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

export type PasswordRecoveryFormData = z.infer<
  typeof passwordRecoveryFormSchema
>;

export const passwordRecoveryFormDefaults: PasswordRecoveryFormData = {
  password: "",
  confirmPassword: "",
  [HONEYPOT_FIELD_NAME]: "",
};
