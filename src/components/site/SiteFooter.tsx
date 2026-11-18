import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, MessageCircle } from "lucide-react";
import { COMPANY, whatsappUrl } from "@/lib/company";

const footerLink = "inline-flex min-h-8 items-center gap-1.5 rounded-sm underline-offset-4 hover:text-ink-foreground hover:underline focus-visible:outline-2 focus-visible:outline-highlight";

export function SiteFooter() {
  return (
    <>
      <footer className="bg-ink text-sm text-ink-foreground/85">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr] lg:gap-10">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg font-display text-lg font-extrabold text-ink-foreground focus-visible:outline-2 focus-visible:outline-highlight">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-lg bg-highlight text-ink">K</span>
              KLİPSMARKET
            </Link>
            <p className="mt-2">Oto klips ve bağlantı elemanları</p>
            <Link to="/urunler" search={{}} className={`${footerLink} mt-3 font-semibold text-highlight`}>Ürün kataloğu <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
          <nav aria-label="Kurumsal bağlantılar">
            <h2 className="mb-2 font-bold text-ink-foreground">Kurumsal</h2>
            <ul className="space-y-1.5">
              <li><Link to="/hakkimizda" className={footerLink}>Hakkımızda</Link></li>
              <li><Link to="/siparis-kosullari" className={footerLink}>Sipariş ve Teslimat Koşulları</Link></li>
              <li><Link to="/kvkk" className={footerLink}>KVKK Aydınlatma Metni</Link></li>
              <li><Link to="/gizlilik" className={footerLink}>Gizlilik ve Çerez Politikası</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="mb-2 font-bold text-ink-foreground">İletişim</h2>
            <address className="space-y-2 not-italic">
              {(COMPANY.visitAddress || COMPANY.address) && <p className="flex max-w-xs items-start gap-2 leading-relaxed"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-highlight" />{COMPANY.visitAddress || COMPANY.address}</p>}
              {COMPANY.phone && <p><a href={`tel:${COMPANY.phone}`} className={footerLink}>{COMPANY.phone}</a></p>}
              {COMPANY.email && <p><a href={`mailto:${COMPANY.email}`} className={footerLink}>{COMPANY.email}</a></p>}
              <Link to="/iletisim" className={footerLink}>İletişime geçin <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
            </address>
          </div>
        </div>
        <div className="border-t border-ink-foreground/10 py-4 text-center text-xs">© {new Date().getFullYear()} {COMPANY.legalName ?? COMPANY.brand}</div>
      </footer>
      {COMPANY.whatsapp && (
        <a href={whatsappUrl(COMPANY.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp ile yazın"
          className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-success text-success-foreground shadow-lg hover:opacity-90">
          <MessageCircle className="h-7 w-7" />
        </a>
      )}
    </>
  );
}
