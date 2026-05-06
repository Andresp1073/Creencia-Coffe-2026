import Link from "next/link";
import { Coffee, ExternalLink } from "lucide-react";

const WHATSAPP_NUMBER = "3004878385";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="mt-24 bg-coffee-dark text-cream"
      role="contentinfo"
      aria-label="Información de contacto y pie de página"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 grid gap-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div 
              className="size-9 rounded-full bg-cream/10 flex items-center justify-center"
              aria-hidden="true"
            >
              <Coffee className="size-5 text-cream" strokeWidth={1.75} />
            </div>
            <div className="font-display text-xl">Cafe Creencia</div>
          </div>
          <p className="text-sm text-cream/70 max-w-xs leading-relaxed">
            Café artesanal tostado en lotes pequeños. Para una nueva experiencia en cada taza.
          </p>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.18em] text-cream/50 mb-4">
            Contacto
          </h4>
          <ul className="space-y-3 text-sm text-cream/80" role="list">
            <li>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola, quiero más información sobre Café Creencia.`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cream transition-smooth flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream/50 rounded"
                aria-label="Contactarnos por WhatsApp (se abre en nueva pestaña)"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
                  <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.197 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>WhatsApp</span>
                <ExternalLink className="size-3 ml-0.5 opacity-60" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a 
                href="https://instagram.com/cafecreencia" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-cream transition-smooth flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cream/50 rounded"
                aria-label="Síguenos en Instagram (se abre en nueva pestaña)"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="18" cy="6" r="1" fill="currentColor" />
                </svg>
                <span>@cafecreencia</span>
                <ExternalLink className="size-3 ml-0.5 opacity-60" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.18em] text-cream/50 mb-4">
            Nuestra promesa
          </h4>
          <p className="text-sm text-cream/70 leading-relaxed">
            Granos seleccionados, tueste reciente y empaque que conserva el aroma.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-cream/60">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-sage" aria-hidden="true" />
              Envío gratis en pedidos mayores a $80.000
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-sage" aria-hidden="true" />
              Tueste fresco garantizado
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-sage" aria-hidden="true" />
              Empaque al vacío
            </li>
          </ul>
        </div>
      </div>
      
      <nav 
        className="border-t border-cream/10"
        aria-label="Navegación secundaria"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 text-xs text-cream/50 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span>© {currentYear} Cafe Creencia.</span>
            <span>Todos los derechos reservados.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Hecho con cariño <span aria-hidden="true">☕</span>
            </span>
          </div>
        </div>
      </nav>
    </footer>
  );
}