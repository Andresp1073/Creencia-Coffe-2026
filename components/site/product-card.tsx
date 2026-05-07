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

export function ProductCard({ product }: ProductCardProps) {
  const presentationLabel = {
    "500g": "500 gramos",
    "250g": "250 gramos",
    "125g": "125 gramos",
  }[product.presentation] || product.presentation;

  const priceFormatted = formatCOP(product.price);

  return (
    <article className="group">
      <Link 
        href={`/producto/${product.slug}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-4 rounded-2xl"
        aria-label={`Ver detalles de ${product.name}, ${presentationLabel}, precio ${priceFormatted}`}
      >
        <div className="relative overflow-hidden rounded-2xl bg-secondary mb-4 shadow-soft h-80">
          <Image
            src={product.image || DEFAULT_IMAGE}
            alt={product.name}
            fill
            className="object-contain transition-smooth group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <span 
            className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.16em] bg-cream text-coffee-dark px-2.5 py-1 rounded-full backdrop-blur"
            aria-label={`Presentacion: ${presentationLabel}`}
          >
            {product.presentation === "500g" ? "500 GRS" : product.presentation === "250g" ? "250 GRS" : product.presentation === "125g" ? "125 GRS" : product.presentation}
          </span>
          <div 
            className="absolute bottom-4 right-4 size-10 rounded-full bg-background/95 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-smooth"
            aria-hidden="true"
          >
            <ArrowUpRight className="size-4 text-coffee-dark" />
          </div>
          <span className="sr-only">
            Clic para ver más detalles
          </span>
        </div>
      </Link>
      <div>
        <h3 className="font-display text-xl text-foreground leading-tight">
          <Link 
            href={`/producto/${product.slug}`}
            className="hover:text-coffee-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded"
          >
            {product.name}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {product.description || `${product.category} · ${presentationLabel}`}
        </p>
        <div 
          className="font-display text-lg text-coffee-dark mt-2"
          aria-label={`Precio: ${priceFormatted}`}
        >
          {priceFormatted}
        </div>
      </div>
    </article>
  );
}