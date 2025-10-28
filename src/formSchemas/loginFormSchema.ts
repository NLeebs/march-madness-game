import { z } from "zod";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_REGEX,
  HONEYPOT_FIELD_NAME,
} from "@/src/constants/CONSTANTS";

export const loginFormSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(1, "Password is required... Obviously")
    .max(PASSWORD_MAX_LENGTH, "Your password is not this long..."),
  [HONEYPOT_FIELD_NAME]: z.string().optional(),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

export const loginFormDefaults: LoginFormData = {
  email: "",
  password: "",
  [HONEYPOT_FIELD_NAME]: "",
};
