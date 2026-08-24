import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Dos densidades, misma estructura — ver
// .claude/skills/design-system/references/components.md.
// "compact" para tablas con muchas filas (inventario, movimientos);
// "standard" (por defecto) para el resto.

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse", className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("sticky top-0 bg-surface border-b border-border-strong", className)}
      {...props}
    />
  );
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-border hover:bg-surface-2 last:border-0", className)}
      {...props}
    />
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "text-left text-xs uppercase tracking-wide text-text-faint font-medium py-2 px-3 first:pl-0",
        className,
      )}
      {...props}
    />
  );
}

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  compact?: boolean;
}

export function Td({ className, numeric, compact, ...props }: TdProps) {
  return (
    <td
      className={cn(
        "text-base text-text px-3 first:pl-0",
        compact ? "py-1.5 text-sm" : "py-3",
        numeric && "font-mono text-right",
        className,
      )}
      {...props}
    />
  );
}
