import { z } from "zod";
import { HONEYPOT_FIELD_NAME } from "@/src/constants/CONSTANTS";

export const newPasswordRequestFormSchema = z.object({
  email: z.string().email("Invalid email format"),
  [HONEYPOT_FIELD_NAME]: z.string().optional(),
});

export type NewPasswordRequestFormData = z.infer<
  typeof newPasswordRequestFormSchema
>;

export const newPasswordRequestFormDefaults: NewPasswordRequestFormData = {
  email: "",
  [HONEYPOT_FIELD_NAME]: "",
};
