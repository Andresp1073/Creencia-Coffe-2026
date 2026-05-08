"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { ProductCard } from "@/components/site/product-card";
import { formatCOP } from "@/lib/utils";
import type { Product as ProductType } from "@/lib/products/products.types";
import { getWhatsAppLink } from "@/lib/whatsapp";

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
  const message = `Hola Cafe Creencia, quiero más información acerca de este producto:\n\n${product.name}`;

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

          <div className="flex flex-col lg:flex-row gap-8 items-stretch">
            <div className="lg:w-1/2">
              <div className="bg-coffee-medium/40 rounded-xl shadow-soft overflow-hidden flex items-start justify-center aspect-[4/3]">
                <Image
                  src={product.image || "/imagenes/Producto.jpg"}
                  alt={product.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
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

              <a
                href={getWhatsAppLink(message)}
                target="_blank"
                rel="noopener"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-whatsapp text-white font-medium shadow-warm hover:shadow-elevated hover:scale-[1.02] transition-smooth"
              >
                <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden>
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.671 5.547l-.999 3.648 3.817-1.005zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                </svg>
                Pedir por WhatsApp
              </a>

              <p className="text-xs text-muted-foreground mt-4">
                Te responderemos para confirmar disponibilidad y envío.
              </p>
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

      <WhatsAppFloat />
    </div>
  );
}