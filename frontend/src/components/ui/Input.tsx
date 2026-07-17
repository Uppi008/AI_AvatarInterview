import { type InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900",
            "placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
