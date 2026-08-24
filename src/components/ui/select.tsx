import { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  tactil?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, tactil, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium text-text-muted">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "bg-surface border border-border rounded-sm px-3 text-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            tactil ? "h-14 text-lg" : "h-10 text-base",
            className,
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  },
);
Select.displayName = "Select";
