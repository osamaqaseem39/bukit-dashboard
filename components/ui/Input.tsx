import React, { useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || `input-${generatedId.replace(/:/g, "")}`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] font-medium text-gray-900 placeholder:text-gray-400",
              "focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-[border-color,box-shadow] duration-150",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
              error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
              icon && "pl-10",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
