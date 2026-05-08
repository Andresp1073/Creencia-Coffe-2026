import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/login",
          "/recuperar-password",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/login",
          "/recuperar-password",
        ],
      },
    ],
    sitemap: "https://cafecreencia.com/sitemap.xml",
    host: "https://cafecreencia.com",
  };
}