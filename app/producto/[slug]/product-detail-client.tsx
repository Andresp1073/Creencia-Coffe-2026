"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check } from "lucide-react";
import { ProductCard } from "@/components/site/product-card";
import { formatCOP } from "@/lib/utils";
import type { Product as ProductType } from "@/lib/products/products.types";

interface Props {
  product: ProductType;
  related: ProductType[];
}

export function ProductDetailClient({ product, related }: Props) {
  const getPresentationLabel = (pres?: string) => {
    switch (pres) {
      case "500g": return "500 g";
      case "250g": return "250 g";
      case "125g": return "125 g";
      default: return "500 g";
    }
  };

  const presentationLabel = getPresentationLabel(product.presentation);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-coffee-dark transition-smooth mb-8"
          >
            <ArrowLeft className="size-4" /> Volver al catálogo
          </Link>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/2">
              <div className="bg-coffee-medium/40 rounded-xl shadow-soft overflow-hidden flex items-start justify-center h-full min-h-[300px] relative">
                <Image
                  src={product.image || "/imagenes/Producto.jpg"}
                  alt={product.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  quality={80}
                  priority
                  decoding="async"
                />
              </div>
            </div>

            <div className="lg:w-1/2">
              <h1 className="font-display text-5xl sm:text-6xl text-foreground mb-6 leading-[1.05]">
                {product.name}
              </h1>

              <span className="inline-block text-sm font-medium tracking-widest text-foreground/70 mb-[10px]">
                {presentationLabel}
              </span>

              <div className="font-display text-4xl text-coffee-dark mb-8">
                {formatCOP(product.price)}
              </div>

              {product.description ? (
                <p className="text-base text-muted-foreground leading-relaxed mb-8">
                  {product.description}
                </p>
              ) : null}

              <ul className="space-y-3 mb-10">
                {[
                  "Tostado reciente, en lotes pequeños",
                  "Empaque sellado que conserva el aroma",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-foreground/80">
                    <span className="mt-0.5 size-5 rounded-full bg-brand-caramel/20 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-brand-caramel" strokeWidth={2.5} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-20 gradient-cream mt-8 sm:mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl mb-6 sm:mb-8 lg:mb-10">También te puede gustar</h2>
          <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}