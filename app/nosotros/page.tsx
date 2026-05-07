import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Flame, Heart, Award, Users, Truck } from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";

const WHATSAPP_NUMBER = "3004878385";

export const metadata = {
  title: "Nosotros",
  description: "Conoce la historia de Café Creencia. Café artesanal tostado en lotes pequeños con más de 10 años de experiencia.",
};

export default function NosotrosPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main id="main-content">
        {/* HERO */}
        <section 
          className="relative py-20 lg:py-28 bg-gradient-cream"
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="max-w-3xl">
              <span className="text-[11px] uppercase tracking-[0.2em] text-sage font-medium">
                Sobre nosotros
              </span>
              <h1 id="hero-heading" className="font-display text-4xl sm:text-5xl lg:text-6xl text-foreground mt-4 mb-6 leading-[1.1]">
                Una creencia en el café <em className="italic font-light">bien hecho</em>.
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                Cafe Creencia nació de la convicción de que un café puede cambiar tu mañana. 
                Trabajamos con productores locales, seleccionamos los granos uno a uno y los tostamos 
                en pequeñas cantidades para entregarte siempre un producto fresco.
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola, quiero conocer más sobre Cafe Creencia.`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full gradient-warm text-cream shadow-soft hover:shadow-warm transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2"
              >
                Conversemos por WhatsApp
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* HISTORIA */}
        <section className="py-20 bg-background" aria-labelledby="history-heading">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-3xl shadow-warm">
                <Image
                  src="/imagenes/Home.jpg"
                  alt="Tostador profesional preparando café artesanal"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-6 -right-4 sm:-right-6 bg-coffee-dark text-cream rounded-2xl p-6 shadow-elevated max-w-[200px]">
                <div className="font-display text-3xl">+10</div>
                <div className="text-xs text-cream/70 mt-1">años de oficio en torno al grano</div>
              </div>
            </div>
            <div>
              <h2 id="history-heading" className="font-display text-3xl sm:text-4xl text-foreground mb-6 leading-[1.1]">
                Nuestro camino
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Todo comenzó con una simple creencia: el café es mucho más que una bebida, 
                  es un momento de conexión, de pausa, de empezar el día con propósito.
                </p>
                <p>
                  Por eso nos dedicamos a buscar los mejores granos de las fincas locales, 
                  las que comparten nuestra visión de respeto por el proceso y la tierra.
                </p>
                <p>
                  Cada bolsa que sale de nuestra tostadora lleva nuestro compromiso: 
                  transparencia, calidad y el deseo de que tu mañana sea un poco mejor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VALORES */}
        <section 
          className="py-20 gradient-cream"
          aria-labelledby="values-heading"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="text-center mb-12">
              <span className="text-[11px] uppercase tracking-[0.2em] text-sage font-medium">
                Lo que nos define
              </span>
              <h2 id="values-heading" className="font-display text-3xl sm:text-4xl text-foreground mt-3">
                Nuestros pilares
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Flame,
                  title: "Tostado artesanal",
                  text: "Cada lote pasa por nuestras manos. Tostamos según el perfil que cada grano pide, buscando siempre el mejor sabor.",
                },
                {
                  icon: Leaf,
                  title: "Origen consciente",
                  text: "Granos seleccionados de fincas que cuidan la tierra y a su gente. Creemos en el comercio justo y sostenible.",
                },
                {
                  icon: Heart,
                  title: "Hecho con cariño",
                  text: "Empaques sellados al vacío, etiquetados a mano y enviados frescos. Cada detalle importa.",
                },
              ].map((v) => (
                <article 
                  key={v.title}
                  className="p-8 rounded-2xl bg-card shadow-soft border border-border/50"
                >
                  <div className="size-12 rounded-full bg-sage/15 flex items-center justify-center mb-5" aria-hidden="true">
                    <v.icon className="size-6 text-sage" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display text-xl mb-3 text-foreground">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* COMPROMISOS */}
        <section className="py-20 bg-background" aria-labelledby="commitments-heading">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="text-center mb-12">
              <span className="text-[11px] uppercase tracking-[0.2em] text-sage font-medium">
                Nuestro compromiso
              </span>
              <h2 id="commitments-heading" className="font-display text-3xl sm:text-4xl text-foreground mt-3">
                ¿Por qué elegirnos?
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Award,
                  title: "Calidad garantizada",
                  desc: "Granos seleccionados uno a uno",
                },
                {
                  icon: Truck,
                  title: "Envío fresco",
                  desc: "Tueste reciente en cada pedido",
                },
                {
                  icon: Leaf,
                  title: "Origen local",
                  desc: "Finca colombiana responsable",
                },
                {
                  icon: Heart,
                  title: "Atención personalizada",
                  desc: "Siempre accesibles por WhatsApp",
                },
              ].map((item) => (
                <div 
                  key={item.title}
                  className="p-6 rounded-xl bg-secondary/50 border border-border/30"
                >
                  <item.icon className="size-8 text-sage mb-3" strokeWidth={1.5} aria-hidden="true" />
                  <h3 className="font-medium text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20" aria-labelledby="cta-heading">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="relative overflow-hidden rounded-3xl bg-coffee-dark px-8 py-16 sm:px-16 sm:py-20 text-cream text-center shadow-elevated">
              <div className="absolute -top-20 -right-20 size-80 rounded-full bg-sage/15 blur-3xl" aria-hidden="true" />
              <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-coffee-medium/40 blur-3xl" aria-hidden="true" />
              <div className="relative">
                <h2 id="cta-heading" className="font-display text-4xl sm:text-5xl mb-4">
                  ¿Te animas a probarlo?
                </h2>
                <p className="text-cream/75 max-w-md mx-auto mb-8">
                  Estamos aquí para ayudarte a encontrar el café perfecto para ti.
                </p>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola, quiero hacer un pedido de café.`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-cream text-coffee-dark font-medium shadow-warm hover:scale-[1.02] transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-coffee-dark"
                >
                  Escríbenos
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