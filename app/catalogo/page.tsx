import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { ProductCard } from "@/components/site/product-card";
import { getProducts, getCategories } from "@/lib/products/products.service";
import { CatalogClient } from "./catalog-client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ presentation?: string; categoria?: string }>;
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const products = await getProducts();
  const categories = await getCategories();
  const presentation = params.presentation || "todos";
  const category = params.categoria || "todos";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <section className="pt-16 pb-10 gradient-cream border-b border-border/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <span className="text-[11px] uppercase tracking-[0.22em] text-sage font-medium">
            Catálogo
          </span>
          <h1 className="font-display text-5xl sm:text-6xl text-foreground mt-3 mb-4">
            Nuestro café
          </h1>
          <p className="text-muted-foreground">
            Cada presentación pensada para un momento. Elige la que mejor acompañe tu día.
          </p>
        </div>
      </section>

      <CatalogClient 
        products={products} 
        categories={categories}
        initialPresentation={presentation}
        initialCategory={category}
      />

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}