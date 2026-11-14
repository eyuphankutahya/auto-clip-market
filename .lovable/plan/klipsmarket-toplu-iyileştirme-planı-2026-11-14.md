# KlipsMarket toplu iyileştirme planı

## 1. Hız ve daha sade yönetim
- Katalogda yalnızca açılan sayfanın 24 ürününü yükle; toplam ürün sayısını ayrıca getir.
- KM koduna göre doğal sıralamayı, OEM aramasını ve marka/kullanım yeri kesişimini koru.
- Yönetim menüsünü ürün/stok, sipariş/cari ve iletişim gruplarına ayır.
- Uzun stok ve rapor listelerini sayfalara böl; tam liste indirmelerini koru.

## 2. Ürün fotoğrafları
- Yeni ürün ve ürün düzenleme ekranlarına bilgisayar/telefon üzerinden fotoğraf yükleme ekle.
- Orijinali dosya depolamasında koru; katalog için küçük, detay ve büyütme için net kopyalar kullan.
- Veritabanında yalnızca dosya bağlantıları tut; ürün detaylarını kaybettiren sıkıştırma uygulama.
- Yükleme sırasında ilerleme, dosya doğrulama ve hata durumlarını göster.

## 3. Tedarikçiye hazır eksik stok çıktısı
- Seçilen tedarikçinin adı ve yalnızca ona ait stok kodlarıyla ayrı alım çıktısı oluştur.
- Önerilen alım adetlerini çıktı öncesinde düzenlenebilir yap.
- Çoklu tedarikçi kodlarını koru; aynı ürünün alım adedini her kod için tekrar toplayıp şişirme.
- Excel çıktısı stok veya cari hesabını değiştirmesin; gerçek alım mevcut alım ekranından girilsin.

## 4. Güvenli stok ve sipariş işlemleri
- Toplu stok/fiyat aktarımını tek işlem halinde uygula; hata olursa yarım kayıt bırakma.
- Kim, ne zaman, hangi dosyayla hangi eski/yeni değerleri değiştirdi bilgisini kaydet.
- Geri alma işleminde sonradan satış, alım veya düzenleme yapılan ürünleri denetle; bunların değerlerini sessizce ezme.
- Geri almayı da stok hareketi olarak kaydet; geçmişi silme.
- Sipariş gönderimine benzersiz işlem anahtarı ekle; çift tıklama ve aynı talebin yeniden denenmesi ikinci sipariş oluşturmasın.
- Fiyatlar yine güvenilir sipariş hesaplamasından, stok ve cari hareketleri yine mevcut kurallardan oluşsun.

## 5. Katalog kalitesi ve boş bilgiler
- İletişim alanlarında eksik bilgileri ziyaretçiden gizle; iletişim formunu koru.
- Sınıflandırma kontrolünü kolaylaştır; kategori ve araç bilgisi eksik ürünleri ayrı filtrelerle incele.
- Emin olunmayan araç uyumunu otomatik uydurma; yönetici onayıyla kaydet.

## Ek öneri: kalite kontrolünü tamamla
- Mevcut yönetici yetkilerini, sıradan/özel müşteri ayrımını ve tedarikçi bilgilerinin gizliliğini test et.
- Ürün oluşturma, min/max stok, paket adedi, çoklu tedarikçi kodu, sipariş, aktarım ve geri alma için küçük regresyon testleri ekle.
- Masaüstü ve telefon görünümünü kontrol et; test kayıtlarını yalnızca kendi kimlikleriyle temizle.

## Teknik yaklaşım
- Mevcut TanStack Start ve Lovable Cloud yapısını koru; değişiklikleri geriye uyumlu eklemelerle yap.
- Liste sorgularını veritabanında filtreleyip sayfala; doğal kod sıralamasını sayfa sınırlarından önce uygula.
- Yeni işlem kayıtlarına açık yetkiler ve yönetici erişim kuralları ekle; anonim ziyaretçiler yönetim verilerini okuyamasın.
- Dosya yüklemelerini Storage API üzerinden, yalnızca yönetici yazma yetkisiyle gerçekleştir.

## Dışarıdan bilgi gerektirenler
- Gerçek firma bilgileri ve yasal metin onayı kullanıcıdan gelmeli; uydurulmayacak.
- Sipariş/iletişim e-posta bildirimleri doğrulanmış gönderici alan adı ve alıcı adresi olmadan açılmayacak.
- Muhasebe, kargo ve başka ücretli servisler bu kapsama dahil değil.