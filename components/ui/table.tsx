import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef, ThHTMLAttributes, TdHTMLAttributes } from "react";

interface TableProps extends HTMLAttributes<HTMLTableElement> {}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
      <table
        ref={ref}
        className={cn("w-full text-sm", className)}
        {...props}
      />
    </div>
  )
);

Table.displayName = "Table";

interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn("bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground", className)}
      {...props}
    />
  )
);

TableHeader.displayName = "TableHeader";

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("px-6 py-3.5 font-medium text-left", className)}
      {...props}
    />
  )
);

TableHead.displayName = "TableHead";

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn("divide-y divide-border/50", className)}
      {...props}
    />
  )
);

TableBody.displayName = "TableBody";

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("transition-colors hover:bg-muted/30", className)}
      {...props}
    />
  )
);

TableRow.displayName = "TableRow";

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("px-6 py-4", className)}
      {...props}
    />
  )
);

TableCell.displayName = "TableCell";