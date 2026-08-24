import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  tactil?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, tactil, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-text-muted">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "bg-surface border border-border rounded-sm px-3 text-text placeholder:text-text-faint",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            tactil ? "h-14 text-lg" : "h-10 text-base",
            error && "border-danger",
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
