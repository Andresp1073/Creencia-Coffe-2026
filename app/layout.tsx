import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SkipLinks } from "@/components/ui/skip-link";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3E2723",
};

export const metadata: Metadata = {
  title: {
    default: "Café Creencia | Café Artesanal Tostado",
    template: "%s | Café Creencia",
  },
  description: "Café artesanal tostado en lotes pequeños. Para una nueva experiencia en cada taza. Granos seleccionados de fincas locales.",
  keywords: ["café", "artesanal", "tostado", "cafetería", "Colombia", "café orgánico", "café de especialidad"],
  authors: [{ name: "Café Creencia" }],
  creator: "Café Creencia",
  publisher: "Café Creencia",
  metadataBase: new URL("https://cafecreencia.com"),
  openGraph: {
    title: "Café Creencia | Café Artesanal Tostado",
    description: "Café artesanal tostado en lotes pequeños. Para una nueva experiencia en cada taza.",
    url: "https://cafecreencia.com",
    siteName: "Café Creencia",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "/imagenes/LOGO-CC.png",
        width: 512,
        height: 512,
        alt: "Logo Café Creencia",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/imagenes/LOGO-CC.png",
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
      </head>
      <body className="min-h-screen bg-background antialiased">
        <SkipLinks />
        {children}
      </body>
    </html>
  );
}