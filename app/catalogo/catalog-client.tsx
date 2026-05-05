"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/site/product-card";
import { Product } from "@/lib/products/products.types";
import { Category } from "@/lib/products/products.types";
import { Filter, X } from "lucide-react";

interface CatalogClientProps {
  products: Product[];
  categories: Category[];
  initialPresentation: string;
  initialCategory: string;
}

export function CatalogClient({ products, categories, initialPresentation, initialCategory }: CatalogClientProps) {
  const router = useRouter();
  
  const [presentation, setPresentation] = useState(initialPresentation);
  const [category, setCategory] = useState(initialCategory);

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
    const params = new URLSearchParams();
    if (newPresentation && newPresentation !== "todos") params.set("presentation", newPresentation);
    if (newCategory && newCategory !== "todos") params.set("categoria", newCategory);
    router.push(`/catalogo?${params.toString()}`);
  };

  const clearFilters = () => {
    setPresentation("todos");
    setCategory("todos");
    router.push("/catalogo");
  };

  const categoryOptions = [
    { value: "todos", label: "Todos los tipos de café" },
    ...categories.map(cat => ({
      value: cat.slug,
      label: cat.name
    }))
  ];

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="bg-secondary/30 rounded-xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-coffee-dark" />
            <h2 className="font-medium text-foreground">Filtrar productos</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-sage hover:text-sage/80 flex items-center gap-1 transition-colors"
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="presentation-filter" className="block text-sm font-medium text-foreground">
                Presentación
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
                >
                  <option value="todos">Todas las presentaciones</option>
                  <option value="500grs">500 GRS</option>
                  <option value="250grs">250 GRS</option>
                  <option value="125grs">125 GRS</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="category-filter" className="block text-sm font-medium text-foreground">
                Tipo de café
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
                >
                  {categoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {presentation !== "todos" && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-coffee-dark/10 text-coffee-dark text-sm rounded-full">
                Presentación: {presentation}
                <button onClick={() => { setPresentation("todos"); updateFilters("todos", category); }} className="hover:text-coffee-dark/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {category !== "todos" && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-sage/10 text-sage text-sm rounded-full">
                Tipo: {categories.find(c => c.slug === category)?.name || category}
                <button onClick={() => { setCategory("todos"); updateFilters(presentation, "todos"); }} className="hover:text-sage/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 mt-10">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <div className="text-muted-foreground mb-4">
              <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No encontramos productos</h3>
            <p className="text-muted-foreground mb-4">No hay cafés con los filtros que seleccionaste.</p>
            <button
              onClick={clearFilters}
              className="text-sage hover:underline"
            >
              Ver todos los productos
            </button>
          </div>
        )}
      </div>
    </section>
  );
}