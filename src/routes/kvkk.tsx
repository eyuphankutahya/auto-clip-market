import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { COMPANY, show } from "@/lib/company";

const TITLE = "KVKK Aydınlatma Metni — KlipsMarket";
const DESC = "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında KlipsMarket aydınlatma metni.";

export const Route = createFileRoute("/kvkk")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }] }),
  component: Kvkk,
});

function Kvkk() {
  return (
    <LegalPage title="KVKK Aydınlatma Metni" updated="14 Kasım 2026">
      <p>Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") 10. maddesi uyarınca, {COMPANY.brand} sitesini kullanan ziyaretçi ve müşterilerimizi bilgilendirmek için hazırlanmıştır.</p>
      <h2>1. Veri sorumlusu</h2>
      <p>Unvan: {show(COMPANY.legalName)}<br />Adres: {show(COMPANY.address)}<br />E-posta: {show(COMPANY.email)}<br />Telefon: {show(COMPANY.phone)}</p>
      <h2>2. İşlenen kişisel veriler</h2>
      <ul>
        <li><b>Kimlik:</b> ad soyad.</li>
        <li><b>İletişim:</b> e-posta adresi; cari hesap açılan müşterilerde firma adı, telefon ve adres.</li>
        <li><b>Müşteri işlem:</b> sepet içeriği, sipariş talepleri, sipariş notları, cari hesap hareketleri, tahsilat kayıtları.</li>
        <li><b>İşlem güvenliği:</b> giriş bilgileri (şifreniz bizim tarafımızdan görülemeyecek şekilde saklanır) ve oturum kayıtları.</li>
      </ul>
      <h2>3. İşleme amaçları</h2>
      <ul>
        <li>Üyelik hesabının oluşturulması ve yönetilmesi,</li>
        <li>Sipariş taleplerinin alınması, onaylanması ve teslim edilmesi,</li>
        <li>Cari hesap, borç ve tahsilat kayıtlarının tutulması,</li>
        <li>Fatura ve muhasebe yükümlülüklerinin yerine getirilmesi,</li>
        <li>Müşteri sorularının yanıtlanması ve sitenin güvenliğinin sağlanması.</li>
      </ul>
      <h2>4. Hukuki sebepler ve toplama yöntemi</h2>
      <p>Kişisel verileriniz; site üzerindeki kayıt, sipariş ve iletişim formları aracılığıyla elektronik ortamda toplanır. KVKK 5/2 maddesindeki (c) sözleşmenin kurulması ve ifası, (ç) hukuki yükümlülüğün yerine getirilmesi ve (f) meşru menfaat hukuki sebeplerine dayanılarak işlenir.</p>
      <h2>5. Aktarım</h2>
      <p>Verileriniz; yalnızca yukarıdaki amaçlarla sınırlı olarak, kanunen yetkili kamu kurumlarına, kargo ve muhasebe hizmeti aldığımız iş ortaklarına ve sitenin barındırma ve veri tabanı hizmetini sağlayan teknoloji sağlayıcılarına aktarılabilir. Bu sağlayıcıların sunucuları yurt dışında bulunabilir.</p>
      <h2>6. Haklarınız</h2>
      <p>KVKK 11. madde kapsamında; verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı üçüncü kişileri öğrenme, itiraz etme ve zararın giderilmesini talep etme haklarına sahipsiniz. Taleplerinizi {show(COMPANY.email)} adresine veya yukarıdaki posta adresine iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz yanıtlanır.</p>
      <p>Çerezler ve site istatistikleri hakkında bilgi için <Link to="/gizlilik" className="text-accent underline">Gizlilik ve Çerez Politikası</Link> sayfasına bakabilirsiniz.</p>
    </LegalPage>
  );
}
