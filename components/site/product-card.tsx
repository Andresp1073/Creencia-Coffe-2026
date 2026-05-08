import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { formatCOP } from "@/lib/utils";

interface Product {
  id: string | number;
  slug: string;
  name: string;
  category: string;
  presentation: string;
  price: number;
  image?: string;
  description?: string;
}

interface ProductCardProps {
  product: Product;
}

const DEFAULT_IMAGE = "/imagenes/default-producto.jpg";

const presentationLabels: Record<string, string> = {
  "500g": "500 GRS",
  "250g": "250 GRS",
  "125g": "125 GRS",
};

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const presentationLabel = presentationLabels[product.presentation] || product.presentation;
  const priceFormatted = formatCOP(product.price);

  return (
    <article className="group flex flex-col">
      <Link 
        href={`/producto/${product.slug}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel focus-visible:ring-offset-4 rounded-2xl"
        aria-label={`Ver detalles de ${product.name}, ${presentationLabel}, precio ${priceFormatted}`}
      >
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-coffee-medium/40 mb-2 sm:mb-3 md:mb-4 shadow-soft aspect-[4/3] sm:aspect-square">
          <Image
            src={product.image || DEFAULT_IMAGE}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 639px) 33vw, (max-width: 1023px) 50vw, 33vw"
          />
          <span 
            className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[9px] sm:text-[10px] uppercase tracking-[0.14em] bg-cream/95 text-coffee-dark px-2 py-0.5 sm:py-1 rounded-full backdrop-blur-sm"
          >
            {presentationLabel}
          </span>
          <div 
            className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 size-8 sm:size-9 md:size-10 rounded-full bg-background/90 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200"
            aria-hidden="true"
          >
            <ArrowUpRight className="size-3.5 sm:size-4 text-coffee-dark" />
          </div>
        </div>
      </Link>
      <div className="flex flex-col flex-1">
        <h3 className="font-display text-sm sm:text-base md:text-lg text-foreground leading-tight line-clamp-2">
          <Link 
            href={`/producto/${product.slug}`}
            className="hover:text-coffee-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel rounded"
          >
            {product.name}
          </Link>
        </h3>
        <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-2">
          {product.category}
        </p>
        <div 
          className="font-display text-sm sm:text-base md:text-lg text-coffee-dark mt-1 sm:mt-2"
        >
          {priceFormatted}
        </div>
      </div>
    </article>
  );
});