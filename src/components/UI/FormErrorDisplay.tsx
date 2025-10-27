"use client";

interface FormErrorDisplayProps {
  error?: string;
  type?: "error" | "warning" | "info";
  className?: string;
}

export const FormErrorDisplay = ({
  error,
  type = "error",
  className = "",
}: FormErrorDisplayProps) => {
  if (!error) return null;

  const baseClasses = "p-3 rounded-md text-sm";
  const typeClasses = {
    error: "bg-red-50 border border-red-200 text-red-600",
    warning: "bg-yellow-50 border border-yellow-200 text-yellow-700",
    info: "bg-blue-50 border border-blue-200 text-blue-600",
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      <p className="text-wrap">{error}</p>
    </div>
  );
};
