import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-coffee-dark text-cream hover:bg-coffee-medium shadow-soft hover:shadow-warm",
  secondary: "bg-brand-caramel text-cream hover:bg-brand-caramel/90 shadow-soft-sm hover:shadow-warm",
  outline: "border-2 border-coffee-dark text-coffee-dark hover:bg-coffee-dark hover:text-cream",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-danger text-white hover:bg-danger/90 shadow-soft-sm",
  success: "bg-success text-white hover:bg-success/90 shadow-soft-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = "primary", 
    size = "md", 
    loading = false, 
    fullWidth = false, 
    disabled,
    children, 
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Procesando...</span>
          </>
        ) : children}
      </button>
    );
  }
);

Button.displayName = "Button";