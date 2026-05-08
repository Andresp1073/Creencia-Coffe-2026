import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SkipLinks } from "@/components/ui/skip-link";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BASE_URL = "https://cafecreencia.com";
const SITE_NAME = "Café Creencia";
const LOGO_URL = "/imagenes/LOGO-CC.png";
const LOGO_WIDTH = 512;
const LOGO_HEIGHT = 512;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3E2723",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: `${SITE_NAME} | Café Artesanal Tostado`,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Café artesanal tostado en lotes pequeños. Para una nueva experiencia en cada taza. Granos seleccionados de fincas locales en Colombia.",
  keywords: [
    "Café Creencia",
    "café artesanal",
    "café tostado",
    "café colombiano",
    "café premium",
    "café tradicional",
    "tienda de café",
    "café online",
    "café de especialidad",
    "granos seleccionados",
    "tostado artesanal",
    "café lotes pequeños",
    "Colombia café",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
    languages: {
      "es-CO": "/",
      "es": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: BASE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Café Artesanal Tostado`,
    description: "Café artesanal tostado en lotes pequeños. Para una nueva experiencia en cada taza.",
    images: [
      {
        url: LOGO_URL,
        width: LOGO_WIDTH,
        height: LOGO_HEIGHT,
        alt: `${SITE_NAME} Logo`,
      },
    ],
  },
  twitter: {
    card: "summary",
    site: "@cafecreencia",
    creator: "@cafecreencia",
    title: `${SITE_NAME} | Café Artesanal Tostado`,
    description: "Café artesanal tostado en lotes pequeños. Para una nueva experiencia en cada taza.",
    images: [LOGO_URL],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: [
      {
        url: LOGO_URL,
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: LOGO_URL,
        color: "#3E2723",
      },
    ],
  },
  verification: {
    google: "tu-codigo-google-site-verification", // Reemplazar con el código real de Google Search Console
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn(fraunces.variable, inter.variable)}>
      <head>
        <meta name="googlebot" content="notranslate" />
        <meta name="geo.region" content="CO" />
        <meta name="geo.placename" content="Colombia" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <SkipLinks />
        {children}
      </body>
    </html>
  );
}