"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/site/product-card";
import { Product } from "@/lib/products/products.types";
import { Category } from "@/lib/products/products.types";

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

  const filtered = products.filter((p) => {
    const matchesPresentation = presentation === "todos" || p.presentation === presentation;
    const matchesCategory = category === "todos" || p.categorySlug === category;
    return matchesPresentation && matchesCategory;
  });

  const updateFilters = (newPresentation?: string, newCategory?: string) => {
    const params = new URLSearchParams();
    if (newPresentation && newPresentation !== "todos") params.set("presentation", newPresentation);
    if (newCategory && newCategory !== "todos") params.set("categoria", newCategory);
    router.push(`/catalogo?${params.toString()}`);
  };

  const presentationOptions = [
    { value: "todos", label: "Todos" },
    { value: "500g", label: "500g" },
    { value: "250g", label: "250g" },
    { value: "125g", label: "125g" },
  ];

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center mr-2">Por presentación:</span>
            {presentationOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setPresentation(opt.value);
                  updateFilters(opt.value, category);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-smooth border-2 ${
                  presentation === opt.value
                    ? "bg-coffee-dark text-white border-coffee-dark"
                    : "bg-transparent text-muted-foreground border-coffee-dark/20 hover:border-sage/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center mr-2">Por categoría:</span>
            <button
              onClick={() => {
                setCategory("todos");
                updateFilters(presentation, "todos");
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-smooth border-2 ${
                category === "todos"
                  ? "bg-sage text-white border-sage"
                  : "bg-transparent text-muted-foreground border-coffee-dark/20 hover:border-sage/50"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.slug);
                  updateFilters(presentation, cat.slug);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-smooth border-2 ${
                  category === cat.slug
                    ? "bg-sage text-white border-sage"
                    : "bg-transparent text-muted-foreground border-coffee-dark/20 hover:border-sage/50"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 mt-10">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            No hay productos con los filtros seleccionados.
          </div>
        )}
      </div>
    </section>
  );
}