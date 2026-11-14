import { createFileRoute, Link } from "@tanstack/react-router";
import { COMPANY } from "@/lib/company";
import { Button } from "@/components/ui/button";

const TITLE = "Hakkımızda — KlipsMarket";
const DESCRIPTION = "KlipsMarket: araç markası, kullanım yeri ve OEM numarasına göre oto klips ve bağlantı elemanları.";

export const Route = createFileRoute("/hakkimizda")({
  head: () => ({ meta: [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: About,
});

function About() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">Hakkımızda</p>
      <h1 className="mt-2 text-4xl font-extrabold">{COMPANY.brand}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Otomobiller için klips ve bağlantı elemanlarını bir araya getiriyoruz.</p>
      <div className="mt-10 space-y-8 leading-relaxed">
        <section>
          <h2 className="text-xl font-extrabold">Oto klips ve bağlantı elemanları</h2>
          <p className="mt-3 text-muted-foreground">Kapı döşemesinden çamurluk ve davlumbaza, tampon bağlantılarından tesisat sabitlemeye kadar farklı kullanım yerleri için klips çeşitleri sunuyoruz. Kataloğumuzda plastik ve metal klipsler, lastik tapalar, perçinler ve bağlantı aparatları yer alıyor.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold">Uyumlu parçayı bulmak</h2>
          <p className="mt-3 text-muted-foreground">Bir klips birden fazla araçta kullanılabilir. Ürünleri araç markası, kullanım yeri ve mevcut OEM bilgileriyle birlikte sunuyoruz. Parça seçimi konusunda sorularınız için bizimle iletişime geçebilirsiniz.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold">Perakende ve toplu alım</h2>
          <p className="mt-3 text-muted-foreground">Bireysel ihtiyaçlarınız ve toplu alımlarınız için sipariş taleplerinizi alıyoruz. Düzenli alım yapan müşterilerimiz için onay sonrasında cari hesap ve müşteriye özel iskonto tanımlanabiliyor.</p>
        </section>
      </div>
      <div className="mt-10 flex flex-wrap gap-3 border-t pt-6">
        <Button asChild><Link to="/urunler" search={{}}>Ürünler</Link></Button>
        <Button asChild variant="outline"><Link to="/iletisim">İletişim</Link></Button>
      </div>
    </article>
  );
}