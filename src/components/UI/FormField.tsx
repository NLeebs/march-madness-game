"use client";
import { Controller, Control, FieldPath, FieldValues } from "react-hook-form";
import { Input, Label, LoadingBasketball } from "@/src/components";
import { cn } from "@/src/utils";
import { CheckIcon } from "@heroicons/react/24/solid";
import { CONFIRMATION_GREEN } from "@/src/constants";

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type?: "text" | "password" | "email" | "tel" | "url";
  placeholder?: string;
  required?: boolean;
  className?: string;
  isValidating?: boolean;
  isValid?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const FormField = <T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  className = "",
  isValidating = false,
  isValid = false,
  onBlur,
}: FormFieldProps<T>) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1">*</span>}
      </Label>
      <div className="relative">
        <Controller
          control={control}
          name={name}
          render={({ field, fieldState: { error } }) => (
            <>
              <Input
                {...field}
                type={type}
                placeholder={placeholder}
                className={cn(
                  error ? "border-red-500" : isValid ? "border-green-500" : "",
                  "pr-10"
                )}
                onBlur={(e) => {
                  field.onBlur();
                  onBlur?.(e);
                }}
              />
              {field.name === "userName" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  {isValidating && <LoadingBasketball size={20} />}
                  {!isValidating && isValid && !error && (
                    <CheckIcon
                      className="h-5 w-5"
                      style={{ color: CONFIRMATION_GREEN }}
                    />
                  )}
                </div>
              )}
              {error && (
                <p className="text-sm text-red-500 text-wrap">
                  {error.message}
                </p>
              )}
            </>
          )}
        />
      </div>
    </div>
  );
};
