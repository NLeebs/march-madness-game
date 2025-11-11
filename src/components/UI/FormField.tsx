"use client";
import { Controller, Control, FieldPath, FieldValues } from "react-hook-form";
import { Input, Label } from "@/src/components";
import { cn } from "@/src/utils";

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  type?: "text" | "password" | "email" | "tel" | "url";
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const FormField = <T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  className = "",
}: FormFieldProps<T>) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Label>
        {label}
        {required && <span className="ml-1">*</span>}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState: { error } }) => (
          <>
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              className={cn(error ? "border-red-500" : "")}
            />
            {error && (
              <p className="text-sm text-red-500 text-wrap">{error.message}</p>
            )}
          </>
        )}
      />
    </div>
  );
};
