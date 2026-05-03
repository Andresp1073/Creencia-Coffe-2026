import { notFound } from "next/navigation";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getProductBySlug, getProducts } from "@/lib/products/products.service";
import { ProductDetailClient } from "./product-detail-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center px-6 py-24 text-center">
          <div>
            <h1 className="font-display text-4xl mb-3">Producto no encontrado</h1>
            <a href="/catalogo" className="text-sage underline underline-offset-4">
              Volver al catálogo
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const allProducts = await getProducts();
  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <ProductDetailClient product={product} related={related} />
      <Footer />
    </div>
  );
}