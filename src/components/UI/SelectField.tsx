import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Label,
} from "@/src/components/UI/shadComponents";
import { cn } from "@/src/utils";

interface SelectFieldProps {
  label: string;
  popupLabel: string;
  placeholder: string;
  options: { label: string; value: string }[];
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
}

export function SelectField({
  label,
  popupLabel,
  placeholder,
  options,
  value,
  onValueChange,
  containerClassName,
  labelClassName,
  selectClassName,
}: SelectFieldProps) {
  const selectItems = options.map((option) => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
    </SelectItem>
  ));

  return (
    <div
      className={cn(
        "flex justify-center items-center flex-wrap gap-4",
        containerClassName
      )}
    >
      <Label
        className={cn("text-center text-lg", labelClassName)}
        htmlFor="select-field"
      >
        {label}
      </Label>
      <Select name="select-field" value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn("w-full", selectClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{popupLabel}</SelectLabel>
            {selectItems}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
