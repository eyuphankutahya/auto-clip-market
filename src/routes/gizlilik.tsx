import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { COMPANY, show } from "@/lib/company";

const TITLE = "Gizlilik ve Çerez Politikası — KlipsMarket";
const DESC = "KlipsMarket sitesinde tarayıcınızda neyin saklandığı ve hangi ziyaret istatistiklerinin tutulduğu.";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Gizlilik ve Çerez Politikası" updated="14 Kasım 2026">
      <p>Bu sayfa, {COMPANY.brand} sitesini kullanırken tarayıcınızda neyin saklandığını ve hangi bilgilerin kimlere ulaştığını açıklar.</p>
      <h2>Tarayıcınızda saklananlar</h2>
      <ul>
        <li><b>Oturum bilgisi:</b> Giriş yaptığınızda, oturumunuzun açık kalması için tarayıcınızın yerel depolamasında bir oturum anahtarı saklanır. Çıkış yaptığınızda silinir.</li>
        <li><b>Sepet:</b> Sepetinize eklediğiniz ürünler, sayfayı yenilediğinizde kaybolmaması için tarayıcınızın yerel depolamasında saklanır.</li>
      </ul>
      <p>Bu bilgiler sitenin çalışması için gereklidir. Reklam veya takip çerezi kullanılmaz.</p>
      <h2>Hesap ve sipariş bilgileri</h2>
      <p>Kayıt olurken verdiğiniz ad ve e-posta, siparişleriniz ve cari hesap kayıtlarınız sitenin veri tabanında saklanır. Ayrıntılar için KVKK Aydınlatma Metni'ne bakabilirsiniz.</p>
      <h2>Ziyaret istatistikleri</h2>
      <p>Sitenin nasıl kullanıldığını anlamak için Lovable'ın ziyaretçi istatistiklerini kullanıyoruz. Bu sistem çerez kullanmaz, cihazınızda hiçbir şey saklamaz, IP adresinizi tutmaz ve kim olduğunuzu belirlemez. Lovable bu verileri bizim adımıza toplar. <a href="https://lovable.dev/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">Lovable'ın gizlilik politikası</a> bu verileri nasıl işlediğini açıklar.</p>
      <p>Bu sitede kaydedilenler: ziyaret edilen sayfalar, siteye nereden gelindiği, ülke, tarayıcı, işletim sistemi ve cihaz türü, sayfada kalma süresi, sayfaların açılma hızı, hatalar ve tıklanan butonlar ile bağlantılar. Ayrıntılı veriler 90 gün, günlük özetler bir yıl saklanır.</p>
      <p>Sitede çerez onay penceresi bulunmadığından bu bilgiler her ziyaretçi için kaydedilir; çerez kullanılmadan ve kimse tanımlanmadan.</p>
      <h2>Yazı tipleri</h2>
      <p>Sitedeki yazı tipleri Google Fonts üzerinden yüklenir. Bu sırada tarayıcınız Google sunucularına bağlanır ve Google IP adresinizi görebilir.</p>
      <h2>İletişim</h2>
      <p>Sorularınız için: {show(COMPANY.email)}</p>
    </LegalPage>
  );
}
