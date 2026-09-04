import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// El mapeo de qué estado de negocio usa qué semántico vive en
// .claude/skills/design-system/references/tokens.md — añade ahí cualquier
// estado nuevo, no elijas el color por gusto aquí.
const SEMANTIC_CLASSES = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  highlight: "bg-highlight-bg text-highlight",
  neutral: "bg-surface-2 text-text-muted",
} as const;

export type BadgeSemantic = keyof typeof SEMANTIC_CLASSES;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  semantic: BadgeSemantic;
}

export function Badge({ className, semantic, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        SEMANTIC_CLASSES[semantic],
        className,
      )}
      {...props}
    />
  );
}
