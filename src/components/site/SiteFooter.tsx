import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { COMPANY, show, whatsappUrl } from "@/lib/company";

export function SiteFooter() {
  return (
    <>
      <footer className="border-t bg-ink text-sm text-ink-foreground/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <div className="font-display text-lg font-extrabold text-ink-foreground">KLİPSMARKET</div>
            <p className="mt-2">Oto klips ve bağlantı elemanları</p>
          </div>
          <div>
            <div className="mb-2 font-semibold text-ink-foreground">Kurumsal</div>
            <ul className="space-y-1">
              <li><Link to="/iletisim" className="hover:text-ink-foreground">İletişim</Link></li>
              <li><Link to="/siparis-kosullari" className="hover:text-ink-foreground">Sipariş ve Teslimat Koşulları</Link></li>
              <li><Link to="/kvkk" className="hover:text-ink-foreground">KVKK Aydınlatma Metni</Link></li>
              <li><Link to="/gizlilik" className="hover:text-ink-foreground">Gizlilik ve Çerez Politikası</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-semibold text-ink-foreground">İletişim</div>
            <ul className="space-y-1">
              <li>Telefon: {show(COMPANY.phone)}</li>
              <li>E-posta: {show(COMPANY.email)}</li>
              <li>Adres: {show(COMPANY.address)}</li>
            </ul>
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
