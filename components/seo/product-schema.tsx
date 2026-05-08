interface ProductSchemaProps {
  name: string;
  description?: string;
  slug: string;
  image?: string;
  price?: number;
  category?: string;
}

export function ProductSchema({ name, description, slug, image, price, category }: ProductSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `https://cafecreencia.com/producto/${slug}`,
    "url": `https://cafecreencia.com/producto/${slug}`,
    "name": name,
    "description": description || "Café artesanal tostado en lotes pequeños.",
    "image": image ? [image] : ["https://cafecreencia.com/imagenes/Producto.jpg"],
    "category": category || "Café tostado",
    "brand": {
      "@type": "Brand",
      "name": "Café Creencia",
    },
    "publisher": {
      "@id": "https://cafecreencia.com/#organization",
    },
    "offers": price ? {
      "@type": "Offer",
      "price": price,
      "priceCurrency": "COP",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@id": "https://cafecreencia.com/#organization",
      },
    } : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}