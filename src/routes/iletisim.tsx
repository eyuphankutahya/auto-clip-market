import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone, Clock } from "lucide-react";
import { COMPANY, whatsappUrl } from "@/lib/company";
import { ContactForm } from "@/components/site/ContactForm";

const TITLE = "İletişim — KlipsMarket";
const DESC = "KlipsMarket iletişim bilgileri; ürün, fiyat ve toplu alım sorularınızı iletişim formundan gönderin.";

export const Route = createFileRoute("/iletisim")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Contact,
});

function Row({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md border bg-card p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-0.5 font-semibold">{children}</div></div>
    </div>
  );
}

function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold">İletişim</h1>
      <p className="mt-2 text-muted-foreground">Ürün, fiyat, cari hesap ve toplu alım için bize ulaşın.</p>
      <ContactForm />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {COMPANY.phone && <Row icon={Phone} label="Telefon"><a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>{COMPANY.phone}</a></Row>}
        {COMPANY.email && <Row icon={Mail} label="E-posta"><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></Row>}
        {COMPANY.whatsapp && <Row icon={MessageCircle} label="WhatsApp"><a href={whatsappUrl(COMPANY.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp'tan yazın</a></Row>}
        {COMPANY.hours && <Row icon={Clock} label="Çalışma saatleri">{COMPANY.hours}</Row>}
        {COMPANY.address && <div className="sm:col-span-2"><Row icon={MapPin} label="Adres">{COMPANY.address}</Row></div>}
      </div>
      {COMPANY.legalName && <section className="mt-8 border-t pt-4 text-sm"><h2 className="font-semibold">Firma bilgileri</h2><p>{COMPANY.legalName}</p>{COMPANY.taxOffice && <p>Vergi dairesi: {COMPANY.taxOffice}</p>}{COMPANY.taxNumber && <p>Vergi no: {COMPANY.taxNumber}</p>}{COMPANY.mersis && <p>MERSİS: {COMPANY.mersis}</p>}</section>}

    </div>
  );
}
