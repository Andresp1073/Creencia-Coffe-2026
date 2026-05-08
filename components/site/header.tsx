"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Inicio", description: "Página principal" },
  { href: "/catalogo", label: "Catálogo", description: "Ver todos los cafés" },
  { href: "/nosotros", label: "Nosotros", description: "Conoce nuestra historia" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className="sticky top-0 z-50 bg-background border-b border-border shadow-soft"
        role="banner"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-10 h-18 flex items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel focus-visible:ring-offset-2 rounded-lg transition-opacity hover:opacity-90"
            aria-label="Cafe Creencia - Ir a página principal"
          >
            <Image
              src="/imagenes/LOGO-CC.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover shadow-soft transition-transform duration-300 group-hover:scale-105"
              aria-hidden="true"
            />
            <div className="leading-tight">
              <div className="font-display text-lg text-foreground">Cafe Creencia</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Para una nueva experiencia
              </div>
            </div>
          </Link>

          <nav
            className="hidden md:flex items-center gap-8"
            role="navigation"
            aria-label="Navegación principal"
          >
            {links.map((link) => {
              const isActive = pathname === link.href ||
                (link.href === "/catalogo" && pathname.startsWith("/producto")) ||
                (link.href === "/catalogo" && pathname.startsWith("/catalogo"));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm transition-smooth relative font-medium",
                    isActive
                      ? "text-coffee-dark"
                      : "text-foreground/80 hover:text-coffee-dark"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={link.description}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-coffee-dark rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2 text-foreground hover:bg-muted rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <nav
            id="mobile-menu"
            className="md:hidden border-t border-border/60 bg-background"
            role="navigation"
            aria-label="Menú móvil"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href ||
                  (link.href === "/catalogo" && pathname.startsWith("/producto")) ||
                  (link.href === "/catalogo" && pathname.startsWith("/catalogo"));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "text-base py-3 px-3 rounded-lg transition-colors font-medium",
                      isActive
                        ? "text-coffee-dark bg-brand-caramel/10"
                        : "text-foreground/80 hover:bg-muted"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <button
                onClick={() => setOpen(false)}
                className="mt-2 text-sm text-muted-foreground py-2 text-left px-3 rounded-lg hover:bg-muted"
                aria-label="Cerrar menú"
              >
                <span className="flex items-center gap-2">
                  <X className="size-4" /> Cerrar menú
                </span>
              </button>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}