export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://cafecreencia.com/#website",
    "url": "https://cafecreencia.com",
    "name": "Café Creencia",
    "alternateName": ["Cafe Creencia", "Café Creencia Tostado Artesanal"],
    "description": "Café artesanal tostado en lotes pequeños. Para una nueva experiencia en cada taza.",
    "inLanguage": "es-CO",
    "publisher": {
      "@id": "https://cafecreencia.com/#organization",
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://cafecreencia.com/catalogo?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}