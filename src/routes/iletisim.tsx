import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, ClipboardList, Clock, Mail, MapPin, MessageCircle, PackageSearch, Phone, Truck } from "lucide-react";
import hero from "@/assets/hero-clips.jpg";
import { COMPANY, whatsappUrl } from "@/lib/company";
import { ContactForm } from "@/components/site/ContactForm";
import { Button } from "@/components/ui/button";

const TITLE = "İletişim — KlipsMarket";
const DESC = "KlipsMarket iletişim bilgileri; ürün, fiyat ve toplu alım sorularınızı iletişim formundan gönderin.";

export const Route = createFileRoute("/iletisim")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Contact,
});

function Row({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold">{children}</dd>
      </div>
    </div>
  );
}

function Contact() {
  const { address, email, hours, legalName, mapEmbedUrl, mapUrl, mersis, phone, taxNumber, taxOffice, visitAddress, whatsapp } = COMPANY;
  const publicAddress = visitAddress ?? address;
  const hasLocation = mapEmbedUrl || mapUrl || publicAddress;
  const hasChannels = phone || email || whatsapp || hours;
  const channelLink = "rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const quickLink = "flex h-full min-h-16 flex-col items-center justify-center gap-2 rounded-lg border bg-background/50 px-2 py-3 text-center text-xs font-semibold text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:justify-start sm:px-4 sm:text-left sm:text-sm";
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="relative isolate overflow-hidden rounded-xl bg-ink px-5 py-6 text-ink-foreground sm:px-8 sm:py-8">
        <img src={hero} alt="" className="pointer-events-none absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-center sm:w-3/5" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ink/80 sm:bg-transparent sm:bg-linear-to-r sm:from-ink sm:via-ink/95 sm:to-ink/15" />
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">İletişim</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-foreground/85 sm:text-base">Ürün, sipariş ve toplu alım talepleriniz için KlipsMarket ekibine ulaşın.</p>
        <nav aria-label="İletişim bölümleri" className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="bg-ink-foreground text-ink hover:bg-ink-foreground/90"><a href="#mesaj"><MessageCircle aria-hidden="true" />Mesaj yaz</a></Button>
          {hasLocation && <Button asChild variant="outline" className="border-ink-foreground/35 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"><a href="#konum"><MapPin aria-hidden="true" />Konumu gör</a></Button>}
        </nav>
      </header>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        <div id="mesaj" tabIndex={-1} className="min-w-0 scroll-mt-24 focus:outline-none"><ContactForm /></div>
        <aside className="min-w-0 space-y-5">
          {hasLocation && (
            <section id="konum" tabIndex={-1} aria-labelledby="contact-location" className="scroll-mt-24 overflow-hidden rounded-xl border bg-card shadow-sm focus:outline-none">
              <div className="p-5">
                <h2 id="contact-location" className="flex items-center gap-2 text-lg font-extrabold"><MapPin aria-hidden="true" className="h-5 w-5 text-primary" />Konumumuz</h2>
                {publicAddress && <address className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground not-italic">{publicAddress}</address>}
              </div>
              {mapEmbedUrl && (
                <div className="bg-muted lg:relative lg:h-[27rem] lg:overflow-hidden">
                  {/* Enlarge the desktop view without triggering Google's full place card. */}
                  <iframe
                    src={mapEmbedUrl}
                    title="KlipsMarket konum haritası"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="block h-72 w-full border-0 lg:absolute lg:top-0 lg:left-0 lg:w-2/3 lg:origin-top-left lg:scale-150"
                  />
                </div>
              )}
              {(mapUrl || publicAddress) && <div className="flex flex-wrap gap-2 border-t p-4 sm:px-5">
                {mapUrl && <Button asChild className="min-w-36 flex-1">
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer"><ArrowUpRight aria-hidden="true" />Haritalar’da aç</a>
                </Button>}
                {publicAddress && <Button asChild variant="outline" className="min-w-36 flex-1">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(publicAddress)}`} target="_blank" rel="noopener noreferrer"><ArrowUpRight aria-hidden="true" />Yol tarifi al</a>
                </Button>}
              </div>}
            </section>
          )}
          {hasChannels && <section aria-labelledby="contact-channels" className="rounded-xl border bg-card p-5 sm:p-6">
            <h2 id="contact-channels" className="text-lg font-extrabold">İletişim bilgileri</h2>
            <dl className="mt-2 divide-y divide-border">
              {phone && <Row icon={Phone} label="Telefon"><a className={channelLink} href={`tel:${phone.replace(/[\s().-]/g, "")}`}>{phone}</a></Row>}
              {email && <Row icon={Mail} label="E-posta"><a className={channelLink} href={`mailto:${email}`}>{email}</a></Row>}
              {whatsapp && <Row icon={MessageCircle} label="WhatsApp"><a className={channelLink} href={whatsappUrl(whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp’tan yazın</a></Row>}
              {hours && <Row icon={Clock} label="Çalışma saatleri">{hours}</Row>}
            </dl>
          </section>}
          {legalName && <section className="rounded-xl border bg-card p-5 text-sm sm:p-6">
            <h2 className="text-lg font-extrabold">Firma bilgileri</h2>
            <p className="mt-2 font-semibold">{legalName}</p>
            {taxOffice && <p className="mt-1 text-muted-foreground">Vergi dairesi · {taxOffice}</p>}
            {taxNumber && <p className="mt-1 text-muted-foreground">Vergi no · {taxNumber}</p>}
            {mersis && <p className="mt-1 text-muted-foreground">MERSİS · {mersis}</p>}
          </section>}
        </aside>
      </div>
      <nav aria-labelledby="contact-quick-links" className="mt-5 rounded-xl border bg-card p-4 sm:p-5">
        <h2 id="contact-quick-links" className="text-lg font-extrabold">Hızlı bağlantılar</h2>
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <li className="min-w-0"><Link to="/urunler" search={{}} className={quickLink}><PackageSearch aria-hidden="true" className="h-4 w-4 shrink-0" />Ürün kataloğu<ArrowRight aria-hidden="true" className="ml-auto hidden h-4 w-4 shrink-0 md:block" /></Link></li>
          <li className="min-w-0"><Link to="/hesabim" className={quickLink}><ClipboardList aria-hidden="true" className="h-4 w-4 shrink-0" />Siparişlerim<ArrowRight aria-hidden="true" className="ml-auto hidden h-4 w-4 shrink-0 md:block" /></Link></li>
          <li className="min-w-0"><Link to="/siparis-kosullari" className={quickLink}><Truck aria-hidden="true" className="h-4 w-4 shrink-0" />Sipariş ve teslimat koşulları<ArrowRight aria-hidden="true" className="ml-auto hidden h-4 w-4 shrink-0 md:block" /></Link></li>
        </ul>
      </nav>
    </div>
  );
}
