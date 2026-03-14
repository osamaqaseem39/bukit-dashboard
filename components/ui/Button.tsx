import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary:
        "bg-gray-900 text-white hover:bg-gray-800 shadow-md active:scale-[0.99]",
      secondary:
        "bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 hover:border-gray-400 active:scale-[0.99]",
      ghost:
        "text-gray-900 hover:bg-gray-100 active:scale-[0.99]",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 border-0 shadow-md active:scale-[0.99]",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-5 text-[15px]",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
