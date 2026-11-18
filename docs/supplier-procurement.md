# Tedarikçi Siparişleri ve Mal Kabulü

Yönetim panelinde **Ürünler ve stok → Tedarikçi siparişleri** altında açılır.
Sipariş taslağını kaydedin, tedarikçiye ilettiğinizde gönderildi olarak işaretleyin ve her gelen irsaliye için mal kabulünü kesinleştirin. Kesinleşmiş kabul stoğu mevcut alım tetikleyicisi üzerinden artırır. Aynı belgeye ait hatalı giriş, sipariş ayrıntısındaki ters kayıt işlemiyle düzeltilir.

## Lovable kurulumu

1. [Tedarikçi siparişi şemasını](supplier-procurement-schema.sql) mevcut proje şemasına Lovable üzerinden bir kez uygulayın. Şema, depodaki ürün sürümü, alım tetikleyicisi ve denetim kayıtları üzerine kuruludur.
2. Uygulama kodunu aynı dağıtımda senkronize edin ve bağlı API şemasında yeni tabloları, görünümleri ve `supplier_order_command` fonksiyonunu doğrulayın.
3. Eksik stok taslağından ürün aktarmak için [alım taslağı şeması](purchase-draft-schema.sql) da kurulu olmalıdır. Tedarikçi siparişine ürünleri elle ekleme bu şemadan bağımsız çalışır.

Bir irsaliye ilk sürümde tek siparişe kaydedilir. Aktif irsaliye numarası, tedarikçi ve belge yılı başına bir kez kullanılabilir. Ters kayıt geçmişi korur ve aynı belgenin düzeltilmiş kabulüne izin verir. Tedarikçi raporunda ters kayıtla düzeltilen kabul, orijinal teslim gününün net alımından çıkarılır. Fiziksel tedarikçi iadesi ve fatura/ödeme takibi ayrı iş akışlarıdır.

## Test

Uygulama testlerini `npm test` ve tür denetimini `npx tsc --noEmit` ile çalıştırın.

Veritabanı entegrasyon testi sıfırdan geçici bir veritabanı oluşturur ve mevcut migration’ları uyguladıktan sonra yeni şemayı dener. PGlite kuruluysa `node scripts/test-supplier-procurement.mjs` komutunu kullanın. Başka bir klasöre kurulmuşsa PGlite giriş dosyasının yolunu ilk argüman olarak verin.

İki bağımsız PostgreSQL oturumuyla kilitlenme ve eşzamanlı mal kabulü testi için `embedded-postgres` kurulu ortamda `node scripts/test-supplier-procurement.mjs --native` çalıştırın. Modül başka klasördeyse giriş dosyasının yolunu `--native` sonrasında verin. Test yalnızca yerelde geçici bir veritabanı açar.
