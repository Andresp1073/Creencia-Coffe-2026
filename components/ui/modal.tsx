"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: React.ReactNode;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  size = "md", 
  children 
}: ModalProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-4xl",
  };

  const titleId = title ? "modal-title" : undefined;
  const descId = description ? "modal-description" : undefined;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4" role="presentation">
      <div 
        className="absolute inset-0 bg-coffee-dark/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className={cn(
          "relative bg-background rounded-2xl shadow-elevated w-full animate-scale-in overflow-hidden",
          sizeStyles[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {(title || description) && (
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && (
                  <h2 id={titleId} className="font-display text-xl text-foreground">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descId} className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel"
                aria-label="Cerrar modal"
              >
                <X className="size-5 text-muted-foreground" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}