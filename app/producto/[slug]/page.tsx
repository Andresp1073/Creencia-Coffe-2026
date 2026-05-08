import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getProductBySlug, getProducts } from "@/lib/products/products.service";
import { ProductDetailClient } from "./product-detail-client";
import { ProductSchema } from "@/components/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

const BASE_URL = "https://cafecreencia.com";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Producto no encontrado",
      description: "El producto que buscas no está disponible.",
    };
  }

  const title = `${product.name} | Café Creencia`;
  const description = product.description 
    ? `${product.description} - ${product.name} de Café Creencia.`
    : `${product.name} - Café artesanal tostado en lotes pequeños. Compra online en Café Creencia.`;
  const url = `${BASE_URL}/producto/${slug}`;
  const imageUrl = product.image || `${BASE_URL}/imagenes/Producto.jpg`;

  return {
    title,
    description,
    keywords: [
      product.name,
      "Café Creencia",
      "café artesanal",
      "café tostado",
      product.category,
      product.presentation,
      "café colombiano",
      "tienda de café",
    ],
    authors: [{ name: "Café Creencia" }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      locale: "es_CO",
      url,
      siteName: "Café Creencia",
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  
  const [product, allProducts] = await Promise.all([
    getProductBySlug(slug),
    getProducts()
  ]);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center px-6 py-24 text-center">
          <div>
            <h1 className="font-display text-4xl mb-3">Producto no encontrado</h1>
            <a href="/catalogo" className="text-brand-caramel underline underline-offset-4">
              Volver al catálogo
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <>
      <ProductSchema
        name={product.name}
        description={product.description}
        slug={product.slug}
        image={product.image}
        price={product.price}
        category={product.category}
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <ProductDetailClient product={product} related={related} />
        <Footer />
      </div>
    </>
  );
}