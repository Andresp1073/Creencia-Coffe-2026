export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://cafecreencia.com/#organization",
    "name": "Café Creencia",
    "alternateName": ["Cafe Creencia", "Café Creencia Tostado Artesanal"],
    "url": "https://cafecreencia.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://cafecreencia.com/imagenes/LOGO-CC.png",
      "width": 512,
      "height": 512,
    },
    "description": "Café artesanal tostado en lotes pequeños. Granos seleccionados de fincas locales en Colombia.",
    "slogan": "Para una nueva experiencia en cada taza",
    "knowsAbout": [
      "Café artesanal",
      "Tostado de café",
      "Café colombiano",
      "Café de especialidad",
    ],
    "areaServed": {
      "@type": "Country",
      "name": "Colombia",
    },
    "sameAs": [
      "https://www.instagram.com/cafecreencia",
      "https://www.facebook.com/cafecreencia",
      "https://wa.me/573001234567",
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["Spanish", "es"],
      "areaServed": "CO",
      "optionally": "WhatsApp",
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Productos de Café",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Café Tostado 500g",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Café Tostado 250g",
          },
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Café Tostado 125g",
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}