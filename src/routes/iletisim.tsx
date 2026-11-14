import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone, Clock } from "lucide-react";
import { COMPANY, show, whatsappUrl } from "@/lib/company";

const TITLE = "İletişim — KlipsMarket";
const DESC = "KlipsMarket telefon, e-posta, adres ve WhatsApp iletişim bilgileri.";

export const Route = createFileRoute("/iletisim")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }] }),
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
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Row icon={Phone} label="Telefon">{COMPANY.phone ? <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="hover:underline">{COMPANY.phone}</a> : show(null)}</Row>
        <Row icon={Mail} label="E-posta">{COMPANY.email ? <a href={`mailto:${COMPANY.email}`} className="hover:underline">{COMPANY.email}</a> : show(null)}</Row>
        <Row icon={MessageCircle} label="WhatsApp">{COMPANY.whatsapp ? <a href={whatsappUrl(COMPANY.whatsapp)} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp'tan yazın</a> : show(null)}</Row>
        <Row icon={Clock} label="Çalışma saatleri">{show(COMPANY.hours)}</Row>
        <div className="sm:col-span-2"><Row icon={MapPin} label="Adres">{show(COMPANY.address)}</Row></div>
      </div>
      <div className="mt-8 rounded-md border bg-secondary p-4 text-sm">
        <div className="font-semibold">Firma bilgileri</div>
        <div className="mt-1 text-muted-foreground">Unvan: {show(COMPANY.legalName)} · Vergi dairesi: {show(COMPANY.taxOffice)} · Vergi no: {show(COMPANY.taxNumber)} · MERSİS: {show(COMPANY.mersis)}</div>
      </div>
    </div>
  );
}
