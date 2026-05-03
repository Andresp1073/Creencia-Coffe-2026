import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "Café Creencia",
  description: "Café artesanal tostado en lotes pequeños. Para una nueva experiencia en cada taza.",
  keywords: ["café", "artesanal", "tostado", "cafetería", "Colombia"],
  icons: {
    icon: "/imagenes/LOGO-CC.png",
    apple: "/imagenes/LOGO-CC.png",
  },
  openGraph: {
    title: "Café Creencia",
    description: "Café artesanal tostado en lotes pequeños",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn(fraunces.variable, inter.variable)}>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}