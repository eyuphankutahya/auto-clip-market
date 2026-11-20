# Beş ana ürün grubuna göre katalog planı

## Yeni yapı

Ana ürün grupları:

1. **KLİPS**
2. **Soket**
3. **Jant Kapağı**
4. **Çelik Jant Göbekleri**
5. **Oto Bakım Malzemeleri ve Kimyasalları**

Kapı Döşeme, Çamurluk, Panjur, Tampon gibi mevcut kullanım yerleri **KLİPS alt kategorileri** olarak korunur. Mevcut ürünlerin kategori, OEM, marka, tedarikçi, fiyat ve stok bağlantıları değiştirilmez. Yeni dört ana gruba ürün eklenmeden otomatik veya tahmini ürün atanmaz.

## Müşteri tarafı

- Ana sayfada beş ana grup belirgin kartlarla gösterilir; KLİPS kartında alt kategorilere erişim sunulur.
- Ürünler sayfasına **Ana ürün grubu**, **KLİPS türü / kullanım yeri** ve **Araç markası** filtreleri eklenir.
- KLİPS seçildiğinde mevcut bütün klips alt grupları listelenir; alt kategori seçilirse sonuç daralır.
- Soket, jant ve bakım gruplarında gereksiz klips alt kategorisi gösterilmez.
- Marka filtresi bütün ana gruplarla birlikte çalışır; marka bağlantısı olmayan bakım/kimyasal ürünleri genel listede görünmeye devam eder.
- Ürün detayında “Ana grup › Alt kategori” yolu gösterilir. “Tüm Klipsler” gibi yalnızca klibse özgü metinler “Ürünler” ve “Ürün kataloğu” olarak güncellenir.

## Yönetim tarafı

- Ürün ekleme ve düzenlemede önce ana grup seçilir; KLİPS seçilirse ikinci alanda mevcut alt kategoriler açılır.
- Toplu kategori düzenleme ve sınıflandırma kontrolleri aynı hiyerarşiyi kullanır.
- Ana grup/alt kategori yönetimi yanlışlıkla üçüncü seviye oluşturmayı, ana grupları silmeyi ve bağlantılı kayıtları kaybetmeyi engeller.
- Daha önce istenen sadeleştirme tamamlanır: araç **modeli** seçimleri kaldırılır, yalnızca araç **markası** kullanılır. Eski model kayıtları veritabanında kullanım dışı olarak korunur.
- Yeni grupların ürünleri mevcut stok, cari, sipariş, alım listesi, tedarikçi ve raporlama akışlarını aynen kullanır; ayrı bir sipariş sistemi kurulmaz.

## Teknik uygulama

- `categories` tablosuna nullable `parent_id` eklenir; beş ana grup migration ile eklenir ve mevcut kategoriler KLİPS'e bağlanır.
- `catalog_page` ana grup filtresini alt kategorileri kapsayacak şekilde genişletir; sunucu taraflı sayfalama ve doğal KM No sıralaması korunur.
- Katalog sorguları, URL filtreleri ve yönetim formları hiyerarşik kategori tiplerine geçirilir.
- Grup/alt grup kombinasyonları, boş yeni gruplar, marka kesişimleri ve eski ürün bağlantıları için regresyon testleri eklenir.
- Migration sonrası tipler yenilenir; masaüstü/mobil katalog, ürün ekleme-düzenleme ve yönetici toplu düzenleme akışları gerçek oturumla doğrulanır.

## Korunacaklar

- Hiçbir mevcut ürün, stok hareketi, sipariş, cari hareket veya tedarikçi kaydı silinmez.
- Fiyat, stok, çoklu OEM, çoklu marka, tedarikçi gizliliği, 100 ve katları alım kuralları aynen kalır.
- Yeni ana gruplar ürün eklenene kadar dürüst biçimde boş sonuç gösterir.
