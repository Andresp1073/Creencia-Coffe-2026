import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Flame, Heart } from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { ProductCard } from "@/components/site/product-card";
import { getFeaturedProducts } from "@/lib/products/products.service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await getFeaturedProducts();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1920&h=1280&fit=crop"
          alt="Granos de café tostado artesanalmente"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-10 py-24 w-full">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cream/80 mb-6">
              <span className="size-1 rounded-full bg-sage" />
              Tostado artesanal · Lotes pequeños
            </span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-cream leading-[1.05] mb-6">
              Cafe <em className="italic font-light">Creencia</em>
            </h1>
            <p className="text-lg sm:text-xl text-cream/85 max-w-lg mb-10 leading-relaxed">
              Para una nueva experiencia en cada taza. Café cultivado con paciencia y tostado con
              propósito.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/catalogo"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-cream text-coffee-dark font-medium shadow-elevated hover:shadow-warm transition-smooth"
              >
                Ver catálogo
                <ArrowRight className="size-4 transition-smooth group-hover:translate-x-1" />
              </Link>
              <a
                href="https://wa.me/3004878385?text=Hola, quiero más información sobre Cafe Creencia."
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-cream/30 text-cream hover:bg-cream/10 transition-smooth"
              >
                Hablar con nosotros
              </a>
            </div>
          </div>
        </div>

        {/* deco bottom marquee */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-cream/15 backdrop-blur-sm bg-coffee-dark/40">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 py-4 flex flex-wrap gap-8 text-[11px] uppercase tracking-[0.18em] text-cream/70">
            <span>● Tueste reciente</span>
            <span>● Origen seleccionado</span>
            <span>● Empaque que conserva el aroma</span>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-20 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Flame,
              title: "Tostado en casa",
              text: "Cada lote pasa por nuestras manos. Tostamos según el perfil que cada grano pide.",
            },
            {
              icon: Leaf,
              title: "Origen consciente",
              text: "Granos seleccionados de fincas que cuidan la tierra y a su gente.",
            },
            {
              icon: Heart,
              title: "Hecho con cariño",
              text: "Empaques sellados al vacío, etiquetados a mano y enviados frescos.",
            },
          ].map((v) => (
            <div
              key={v.title}
              className="p-8 rounded-2xl bg-card shadow-soft border border-border/50"
            >
              <div className="size-11 rounded-full bg-sage/15 flex items-center justify-center mb-5">
                <v.icon className="size-5 text-sage" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-xl mb-2 text-foreground">{v.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-20 gradient-cream">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-sage font-medium">
                Nuestro café
              </span>
              <h2 className="font-display text-4xl sm:text-5xl text-foreground mt-3 max-w-xl">
                Productos destacados
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 text-sm font-medium text-coffee-dark hover:gap-3 transition-all"
            >
              Ver todo el catálogo <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="sobre-nosotros" className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-3xl shadow-warm">
              <Image
                src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=1000&fit=crop"
                alt="Manos de tostador con granos de café"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-4 sm:-right-6 bg-coffee-dark text-cream rounded-2xl p-6 shadow-elevated max-w-[200px]">
              <div className="font-display text-3xl">+10</div>
              <div className="text-xs text-cream/70 mt-1">años de oficio en torno al grano</div>
            </div>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] text-sage font-medium">
              Sobre nosotros
            </span>
            <h2 className="font-display text-4xl sm:text-5xl text-foreground mt-3 mb-6 leading-[1.1]">
              Una creencia en el café <em className="italic font-light">bien hecho</em>.
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              Cafe Creencia nació de la convicción de que un café puede cambiar tu mañana.
              Trabajamos con productores locales, seleccionamos los granos uno a uno y los tostamos
              en pequeñas cantidades para entregarte siempre un producto fresco.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed mb-8">
              Cada bolsa que sale de nuestro taller lleva nuestro compromiso: transparencia, oficio
              y respeto por el grano.
            </p>
            <a
              href="https://wa.me/3004878385?text=Hola, quiero conocer más sobre Cafe Creencia."
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full gradient-warm text-cream shadow-soft hover:shadow-warm transition-smooth"
            >
              Conversemos por WhatsApp
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="relative overflow-hidden rounded-3xl bg-coffee-dark px-8 py-16 sm:px-16 sm:py-20 text-cream text-center shadow-elevated">
            <div className="absolute -top-20 -right-20 size-80 rounded-full bg-sage/15 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-coffee-medium/40 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-4xl sm:text-5xl mb-4">¿Listo para probarlo?</h2>
              <p className="text-cream/75 max-w-md mx-auto mb-8">
                Pide tu café por WhatsApp y recíbelo recién tostado.
              </p>
              <a
                href="https://wa.me/3004878385?text=Hola, quiero hacer un pedido de café."
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-cream text-coffee-dark font-medium shadow-warm hover:scale-[1.02] transition-smooth"
              >
                Pedir por WhatsApp
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}