import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

// Variantes y tamaños documentados en
// .claude/skills/design-system/references/components.md — no añadir una
// variante de color nueva sin actualizar ese archivo primero.

const VARIANT_CLASSES = {
  primary: "bg-brand text-brand-on hover:bg-brand-hover",
  secondary:
    "bg-surface border border-border text-text hover:bg-surface-2",
  ghost: "bg-transparent text-brand hover:bg-brand-subtle",
  danger: "bg-danger text-brand-on hover:bg-danger-hover",
} as const;

const SIZE_CLASSES = {
  compacto: "h-8 px-2.5 text-sm",
  normal: "h-10 px-4 text-base",
  tactil: "h-16 px-6 text-lg",
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;
export type ButtonSize = keyof typeof SIZE_CLASSES;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "normal", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
