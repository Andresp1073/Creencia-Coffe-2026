import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Flame, Heart, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { ProductCard } from "@/components/site/product-card";
import { getFeaturedProducts } from "@/lib/products/products.service";
import { getWhatsAppLink } from "@/lib/whatsapp";

export const revalidate = 60;

export default async function HomePage() {
  const featured = await getFeaturedProducts();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main id="main-content">
        {/* HERO */}
        <section 
          className="relative min-h-[88vh] flex items-center overflow-hidden"
          aria-label="Bienvenido a Café Creencia"
        >
          <Image
            src="/imagenes/Inicio-cafe.jpg"
            alt="Barista preparando café artesanal con granos de alta calidad"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl px-6 lg:px-10 py-24 w-full">
            <div className="max-w-2xl animate-fade-up">
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cream/80 mb-6">
                <span className="size-1 rounded-full bg-brand-caramel/15" aria-hidden="true" />
                Tostado artesanal · Lotes pequeños
              </span>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-cream leading-[1.05] mb-6">
                Cafe <em className="italic font-light">Creencia</em>
              </h1>
              <p className="text-lg sm:text-xl text-cream/85 max-w-lg mb-10 leading-relaxed">
                Para una nueva experiencia en cada taza. Café cultivado con paciencia y tostado con propósito.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/catalogo"
                  className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-cream text-coffee-dark font-medium shadow-elevated hover:shadow-warm transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-coffee-dark"
                >
                  Ver catálogo
                  <ArrowRight className="size-4 transition-smooth group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <a
                  href={getWhatsAppLink("Hola, quiero más información sobre Cafe Creencia.")}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-cream/30 text-cream hover:bg-cream/10 transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2"
                  aria-label="Contactarnos por WhatsApp (se abre en nueva pestaña)"
                >
                  Hablar con nosotros
                </a>
              </div>
            </div>
          </div>

          <div 
            className="absolute bottom-0 left-0 right-0 border-t border-cream/15 backdrop-blur-sm bg-coffee-dark/40"
            aria-hidden="true"
          >
            <div className="mx-auto max-w-7xl px-6 lg:px-10 py-4 flex flex-wrap gap-8 text-[11px] uppercase tracking-[0.18em] text-cream/70">
              <span className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-brand-caramel/15" /> Tueste reciente
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-brand-caramel/15" /> Origen seleccionado
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-brand-caramel/15" /> Empaque que conserva el aroma
              </span>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section 
          className="py-20 bg-background"
          aria-labelledby="values-heading"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <h2 id="values-heading" className="sr-only">Nuestros valores</h2>
            <div className="grid gap-8 md:grid-cols-3" role="list">
              {[
                {
                  icon: Flame,
                  title: "Tostado en casa",
                  text: "Cada lote pasa por nuestras manos. Tostamos según el perfil que cada grano pide.",
                  benefit: "Tueste personalizado",
                },
                {
                  icon: Leaf,
                  title: "Origen consciente",
                  text: "Granos seleccionados de fincas que cuidan la tierra y a su gente.",
                  benefit: "Comercio justo",
                },
                {
                  icon: Heart,
                  title: "Hecho con cariño",
                  text: "Empaques sellados al vacío, etiquetados a mano y enviados frescos.",
                  benefit: "Calidad garantizada",
                },
              ].map((v) => (
                <article 
                  key={v.title}
                  className="p-8 rounded-2xl bg-card shadow-soft border border-border/50 hover:shadow-warm transition-shadow"
                  role="listitem"
                >
                  <div className="size-11 rounded-full bg-brand-caramel/15 flex items-center justify-center mb-5" aria-hidden="true">
                    <v.icon className="size-5 text-brand-caramel" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display text-xl mb-2 text-foreground">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{v.text}</p>
                  <div className="flex items-center gap-2 text-xs text-brand-caramel font-medium">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    {v.benefit}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* PRODUCTS */}
        <section 
          className="py-12 sm:py-16 lg:py-20 gradient-cream"
          aria-labelledby="products-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="flex items-end justify-between mb-8 sm:mb-10 lg:mb-12 gap-4 sm:gap-6 flex-wrap">
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-brand-caramel font-medium">
                  Nuestro café
                </span>
                <h2 id="products-heading" className="font-display text-3xl sm:text-4xl lg:text-5xl text-foreground mt-2 sm:mt-3 max-w-xl">
                  Productos destacados
                </h2>
              </div>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 text-sm font-medium text-coffee-dark hover:gap-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel rounded"
              >
                Ver todo el catálogo 
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div 
              className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3"
              role="list"
              aria-label="Lista de cafés destacados"
            >
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section 
          id="sobre-nosotros" 
          className="py-24 bg-background"
          aria-labelledby="about-heading"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-3xl shadow-warm">
                <Image
                  src="/imagenes/Home.jpg"
                  alt="Tostador profesional preparando café artesanal en tostadora de tambor"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div 
                className="absolute -bottom-6 -right-4 sm:-right-6 bg-coffee-dark text-cream rounded-2xl p-6 shadow-elevated max-w-[200px]"
                aria-label="Más de 10 años de experiencia"
              >
                <div className="font-display text-3xl">+10</div>
                <div className="text-xs text-cream/70 mt-1">años de oficio en torno al grano</div>
              </div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-brand-caramel font-medium">
                Sobre nosotros
              </span>
              <h2 id="about-heading" className="font-display text-4xl sm:text-5xl text-foreground mt-3 mb-6 leading-[1.1]">
                Una creencia en el café <em className="italic font-light">bien hecho</em>.
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                Cafe Creencia nació de la convicción de que un café puede cambiar tu mañana.
                Trabajamos con productores locales, seleccionamos los granos uno a uno y los tostamos
                en pequeñas cantidades para entregarte siempre un producto fresco.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                Cada bolsa que sale lleva nuestro compromiso: transparencia, oficio
                y respeto por el grano.
              </p>
              <a
                href={getWhatsAppLink("Hola, quiero conocer más sobre Cafe Creencia.")}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full gradient-warm text-cream shadow-soft hover:shadow-warm transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2"
                aria-label="Enviar mensaje por WhatsApp (se abre en nueva pestaña)"
              >
                Conversemos por WhatsApp
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section 
          className="pb-20"
          aria-labelledby="cta-heading"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div 
              className="relative overflow-hidden rounded-3xl bg-coffee-dark px-8 py-16 sm:px-16 sm:py-20 text-cream text-center shadow-elevated"
              role="region"
              aria-label="Llamado a la acción"
            >
              <div 
                className="absolute -top-20 -right-20 size-80 rounded-full bg-brand-caramel/15 blur-3xl" 
                aria-hidden="true"
              />
              <div 
                className="absolute -bottom-20 -left-20 size-80 rounded-full bg-coffee-medium/40 blur-3xl" 
                aria-hidden="true"
              />
              <div className="relative">
                <h2 id="cta-heading" className="font-display text-4xl sm:text-5xl mb-4">
                  ¿Listo para probarlo?
                </h2>
<p className="text-cream/75 max-w-md mx-auto mb-8">
                  Pide tu café por WhatsApp y recíbelo recientemente tostado.
                </p>
                <a
                  href={getWhatsAppLink("Hola, quiero hacer un pedido de café.")}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-cream text-coffee-dark font-medium shadow-warm hover:scale-[1.02] transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-coffee-dark"
                  aria-label="Hacer pedido por WhatsApp (se abre en nueva pestaña)"
                >
                  Pedir por WhatsApp
                  <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}