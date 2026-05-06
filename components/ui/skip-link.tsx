"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function SkipLinks() {
  return (
    <nav aria-label="Saltar navegación" className="sr-only">
      <ul>
        <li>
          <a
            href="#main-content"
            className="fixed top-4 left-4 z-50 px-4 py-2 bg-coffee-dark text-cream rounded-lg shadow-lg translate-y-[-100%] focus:translate-y-0 transition-transform"
          >
            Saltar al contenido principal <ChevronRight className="inline size-4" />
          </a>
        </li>
        <li>
          <a
            href="#main-navigation"
            className="sr-only focus:not-sr-only"
          >
            Saltar a navegación principal
          </a>
        </li>
      </ul>
    </nav>
  );
}

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link
            href="/"
            className="hover:text-coffee-dark transition-colors"
          >
            Inicio
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-coffee-dark transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}