"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Inicio", description: "Página principal" },
  { href: "/catalogo", label: "Catálogo", description: "Ver todos los cafés" },
  { href: "/nosotros", label: "Nosotros", description: "Conoce nuestra historia" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/catalogo") return pathname.startsWith("/catalogo") || pathname.startsWith("/producto");
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-background/95 backdrop-blur-lg shadow-elevated border-b border-border/50 py-3"
            : "bg-transparent py-5"
        )}
        role="banner"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel focus-visible:ring-offset-2 rounded-lg transition-opacity hover:opacity-90"
              aria-label="Cafe Creencia - Ir a página principal"
            >
              <div className="relative">
                <Image
                  src="/imagenes/LOGO-CC.png"
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover shadow-elevated transition-transform duration-300 group-hover:scale-105"
                  aria-hidden="true"
                />
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="font-display text-xl text-foreground">Cafe Creencia</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Tostado artesanal
                </div>
              </div>
            </Link>

            <nav
              className="hidden md:flex items-center gap-1"
              role="navigation"
              aria-label="Navegación principal"
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-4 py-2.5 text-sm font-medium rounded-full transition-all duration-200",
                    isActive(link.href)
                      ? "text-coffee-dark bg-coffee-dark/10"
                      : "text-foreground/80 hover:text-coffee-dark hover:bg-muted/50"
                  )}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  aria-label={link.description}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/catalogo"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full bg-coffee-dark text-cream hover:bg-coffee-medium transition-colors shadow-soft hover:shadow-warm"
                aria-label="Ver catálogo de productos"
              >
                <ShoppingBag className="size-4" />
                <span>Catálogo</span>
              </Link>

              <button
                onClick={() => setOpen(!open)}
                className={cn(
                  "p-2.5 rounded-full transition-all duration-200 md:hidden",
                  open ? "bg-muted text-foreground" : "text-foreground hover:bg-muted"
                )}
                aria-label={open ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={open}
                aria-controls="mobile-menu"
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-coffee-dark/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        id="mobile-menu"
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-background shadow-elevated transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="navigation"
        aria-label="Menú móvil"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <Image
                src="/imagenes/LOGO-CC.png"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover"
                aria-hidden="true"
              />
              <span className="font-display text-lg text-foreground">Menu</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="size-5 text-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-4 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-colors",
                    isActive(link.href)
                      ? "text-coffee-dark bg-brand-caramel/10"
                      : "text-foreground/80 hover:text-coffee-dark hover:bg-muted"
                  )}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-0 transition-opacity data-[active=true]:opacity-100" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/30">
            <Link
              href="/catalogo"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 text-base font-medium rounded-full bg-coffee-dark text-cream hover:bg-coffee-medium transition-colors"
            >
              <ShoppingBag className="size-5" />
              Ver catálogo
            </Link>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Tostado artesanal · Lotes pequenos
            </p>
          </div>
        </div>
      </nav>
    </>
  );
}
