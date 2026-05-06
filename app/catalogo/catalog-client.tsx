"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/site/product-card";
import { Product } from "@/lib/products/products.types";
import { Category } from "@/lib/products/products.types";
import { Filter, X, SearchX, RotateCcw } from "lucide-react";
import { ProductCardSkeleton } from "@/components/ui/skeleton";

interface CatalogClientProps {
  products: Product[];
  categories: Category[];
  initialPresentation: string;
  initialCategory: string;
}

export function CatalogClient({ products, categories, initialPresentation, initialCategory }: CatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [presentation, setPresentation] = useState(initialPresentation);
  const [category, setCategory] = useState(initialCategory);
  const [isLoading, setIsLoading] = useState(false);

  const hasActiveFilters = presentation !== "todos" || category !== "todos";

  const filtered = products.filter((p) => {
    const presentationMap: Record<string, string> = {
      "500grs": "500g", "250grs": "250g", "125grs": "125g"
    };
    const dbPresentation = presentationMap[presentation] || presentation;
    const matchesPresentation = presentation === "todos" || p.presentation === dbPresentation;
    const matchesCategory = category === "todos" || p.categorySlug === category;
    return matchesPresentation && matchesCategory;
  });

  const updateFilters = (newPresentation?: string, newCategory?: string) => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (newPresentation && newPresentation !== "todos") params.set("presentation", newPresentation);
    if (newCategory && newCategory !== "todos") params.set("categoria", newCategory);
    
    setTimeout(() => {
      router.push(`/catalogo?${params.toString()}`);
      setIsLoading(false);
    }, 150);
  };

  const clearFilters = () => {
    setIsLoading(true);
    setPresentation("todos");
    setCategory("todos");
    setTimeout(() => {
      router.push("/catalogo");
      setIsLoading(false);
    }, 150);
  };

  const categoryOptions = [
    { value: "todos", label: "Todos los tipos de café" },
    ...categories.map(cat => ({
      value: cat.slug,
      label: cat.name
    }))
  ];

  const presentationLabels: Record<string, string> = {
    "500grs": "500 gramos",
    "250grs": "250 gramos",
    "125grs": "125 gramos",
  };

  const getFilterDescription = () => {
    const parts: string[] = [];
    if (presentation !== "todos") {
      parts.push(presentationLabels[presentation] || presentation);
    }
    if (category !== "todos") {
      const catName = categories.find(c => c.slug === category)?.name || category;
      parts.push(catName);
    }
    return parts.join(" · ");
  };

  return (
    <section className="py-12" aria-label="Catálogo de productos">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div 
          className="bg-secondary/30 rounded-xl p-6 border border-border/50"
          role="region" 
          aria-label="Filtros de búsqueda"
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-coffee-dark" aria-hidden="true" />
            <h2 className="font-medium text-foreground">Filtrar productos</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-sage hover:text-sage/80 flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded"
                aria-label="Limpiar todos los filtros activos"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Limpiar filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label 
                htmlFor="presentation-filter" 
                className="block text-sm font-medium text-foreground"
              >
                Presentación
                <span className="sr-only"> (seleccionar para filtrar por tamaño)</span>
              </label>
              <div className="relative">
                <select
                  id="presentation-filter"
                  value={presentation}
                  onChange={(e) => {
                    setPresentation(e.target.value);
                    updateFilters(e.target.value, category);
                  }}
                  className="input-base w-full appearance-none cursor-pointer"
                  aria-describedby="presentation-help"
                >
                  <option value="todos">Todas las presentaciones</option>
                  <option value="500grs">500 GRS</option>
                  <option value="250grs">250 GRS</option>
                  <option value="125grs">125 GRS</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p id="presentation-help" className="text-xs text-muted-foreground">
                Elige el tamaño de la bolsa de café
              </p>
            </div>

            <div className="space-y-2">
              <label 
                htmlFor="category-filter" 
                className="block text-sm font-medium text-foreground"
              >
                Tipo de café
                <span className="sr-only"> (seleccionar para filtrar por tipo)</span>
              </label>
              <div className="relative">
                <select
                  id="category-filter"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    updateFilters(presentation, e.target.value);
                  }}
                  className="input-base w-full appearance-none cursor-pointer"
                  aria-describedby="category-help"
                >
                  {categoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p id="category-help" className="text-xs text-muted-foreground">
                Filtrar por tipo de tostión y origen
              </p>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div 
            className="mt-4 flex flex-wrap gap-2" 
            role="status" 
            aria-live="polite"
            aria-label="Filtros activos"
          >
            {presentation !== "todos" && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-coffee-dark/10 text-coffee-dark text-sm rounded-full" role="group" aria-label="Filtro de presentación">
                <span>{presentationLabels[presentation] || presentation}</span>
                <button 
                  onClick={() => { setPresentation("todos"); updateFilters("todos", category); }} 
                  className="hover:text-coffee-dark/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee-dark rounded"
                  aria-label={`Quitar filtro de ${presentationLabels[presentation] || presentation}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {category !== "todos" && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-sage/10 text-sage text-sm rounded-full" role="group" aria-label="Filtro de categoría">
                <span>{categories.find(c => c.slug === category)?.name || category}</span>
                <button 
                  onClick={() => { setCategory("todos"); updateFilters(presentation, "todos"); }} 
                  className="hover:text-sage/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded"
                  aria-label={`Quitar filtro de ${categories.find(c => c.slug === category)?.name || category}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        <div 
          className="mt-6 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {isLoading ? (
            <span>Cargando productos...</span>
          ) : hasActiveFilters ? (
            <span>Mostrando {filtered.length} {filtered.length === 1 ? "producto" : "productos"} con: <strong>{getFilterDescription()}</strong></span>
          ) : (
            <span>Mostrando todos los productos ({filtered.length} {filtered.length === 1 ? "café" : "cafés"})</span>
          )}
        </div>

        <div 
          className={`grid gap-8 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 mt-6 transition-opacity ${isLoading ? "opacity-50" : "opacity-100"}`}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </>
          ) : (
            filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))
          )}
        </div>

        {filtered.length === 0 && !isLoading && (
          <div 
            className="py-20 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="text-muted-foreground mb-4" aria-hidden="true">
              <SearchX className="w-16 h-16 mx-auto opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No encontramos productos</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              No hay cafés disponibles con los filtros que seleccionaste. 
              Prueba quitando algunos filtros para ver más opciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sage text-white font-medium shadow-soft hover:shadow-warm transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
              >
                <RotateCcw className="size-4" />
                Restablecer filtros
              </button>
              <a
                href="/catalogo"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-coffee-dark text-coffee-dark font-medium hover:bg-coffee-dark/5 transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee-dark focus-visible:ring-offset-2"
              >
                Ver todos los cafés
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}