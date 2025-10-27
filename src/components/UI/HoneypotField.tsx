"use client";
import { Controller, Control, FieldPath, FieldValues } from "react-hook-form";
import { HONEYPOT_FIELD_NAME } from "@/src/constants/CONSTANTS";

interface HoneypotInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
}

export const HoneypotInput = <T extends FieldValues>({
  control,
  name,
}: HoneypotInputProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div
          className="sr-only"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          <label htmlFor={HONEYPOT_FIELD_NAME} className="sr-only">
            Please leave this field empty - this is a spam prevention field
          </label>
          <input
            {...field}
            id={HONEYPOT_FIELD_NAME}
            name={HONEYPOT_FIELD_NAME}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-label="Spam prevention field - please leave empty"
            className="sr-only"
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: 0,
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0, 0, 0, 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          />
        </div>
      )}
    />
  );
};
