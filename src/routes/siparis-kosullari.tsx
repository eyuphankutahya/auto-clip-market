import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { COMPANY, show } from "@/lib/company";

const TITLE = "Sipariş ve Teslimat Koşulları — KlipsMarket";
const DESC = "KlipsMarket'te sipariş talebi, ödeme, cari hesap, teslimat ve iade koşulları.";

export const Route = createFileRoute("/siparis-kosullari")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Sipariş ve Teslimat Koşulları" updated="14 Kasım 2026">
      <h2>Sipariş talebi</h2>
      <p>Sitede online ödeme alınmaz. Sepetinizi onayladığınızda bir <b>sipariş talebi</b> oluşur. Siparişiniz, stok ve fiyat kontrolünden sonra tarafımızdan onaylandığında kesinleşir. Onay durumunu <Link to="/hesabim" className="text-accent underline">Hesabım</Link> sayfasından takip edebilirsiniz.</p>
      <h2>Fiyatlar ve stok</h2>
      <ul>
        <li>Fiyatlar Türk Lirası'dır. Fiyatı henüz belirlenmemiş ürünler "Fiyat yakında" olarak gösterilir ve sipariş edilemez.</li>
        <li>Stokta bulunandan fazla adet sipariş edilemez.</li>
      </ul>
      <h2>Ödeme ve cari hesap</h2>
      <ul>
        <li>Standart müşterilerde ödeme, sipariş onayından sonra sizinle kararlaştırılan yöntemle (havale, nakit vb.) yapılır.</li>
        <li>Cari hesaplı müşterilerde onaylanan sipariş tutarı cari hesaba borç olarak yazılır. Tahsilatlar cari hesaba işlenir ve ekstrede görünür.</li>
      </ul>
      <h2>Teslimat</h2>
      <p>Onaylanan siparişler kargo ile veya mağazadan teslim edilir. Teslimat süresi ve kargo ücreti sipariş onayında bildirilir.</p>
      <h2>İptal ve iade</h2>
      <p>Onaylanmamış sipariş talepleri ücretsiz iptal edilebilir. Tüketici olarak alışveriş yapan müşterilerimiz, Mesafeli Sözleşmeler Yönetmeliği kapsamında teslimden itibaren 14 gün içinde cayma hakkını kullanabilir. İade edilecek ürünler kullanılmamış ve ambalajında olmalıdır.</p>
      <h2>İletişim</h2>
      <p>Telefon: {show(COMPANY.phone)} · E-posta: {show(COMPANY.email)}</p>
    </LegalPage>
  );
}
