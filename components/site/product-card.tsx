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
}

interface ProductCardProps {
  product: Product;
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=500&fit=crop";

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-secondary mb-4 shadow-soft h-80">
        <Image
          src={product.image || DEFAULT_IMAGE}
          alt={product.name}
          fill
          className="object-cover transition-smooth group-hover:scale-105"
        />
        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.16em] bg-cream text-coffee-dark px-2.5 py-1 rounded-full backdrop-blur">
          {product.presentation === "500g" ? "500 GRS" : product.presentation === "250g" ? "250 GRS" : product.presentation === "125g" ? "125 GRS" : product.presentation}
        </span>
        <span className="absolute bottom-4 right-4 size-10 rounded-full bg-background/95 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-smooth">
          <ArrowUpRight className="size-4 text-coffee-dark" />
        </span>
      </div>
      <div>
        <h3 className="font-display text-xl text-foreground leading-tight">{product.name}</h3>
        <div className="font-display text-lg text-coffee-dark mt-2">
          {formatCOP(product.price)}
        </div>
      </div>
    </Link>
  );
}