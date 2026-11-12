# Klips E-Ticaret Sitesi Planı

Online ödeme olmadan sipariş toplayan, cari hesaplı toplu alıcıları ve süper admin stok/alım takibini destekleyen klips satış sitesi. Veriler ve girişler Lovable Cloud ile tutulur.

## Kullanıcı tipleri
- **Ziyaretçi**: Ürünleri gezer, arar.
- **Standart kullanıcı**: E-posta + şifre ile kayıt/giriş, sepete ekleme, sipariş talebi gönderme, siparişlerini görme.
- **Cari hesaplı müşteri**: Süper admin tarafından yetki verilir. İskonto oranlı fiyat görür; siparişleri cari hesabına borç yazılır. Kendi cari ekstresini görür.
- **Süper admin**: Tüm yönetim paneli.

## Ürün kataloğu
- Ürün: ad, OEM numarası (bir veya birden fazla), açıklama, görsel, satış fiyatı, stok.
- **Kullanım yerine göre kategori** (kapı döşemesi, tampon, çamurluk, bagaj vb.).
- **Araç markası / modeline göre** listeleme; bir ürün birden fazla marka/modele bağlanabilir.
- Arama: OEM numarası, ürün adı; filtre: kategori + marka + model.
- Ürün sayfasında "Uyumlu araçlar" listesi.

## Sepet ve sipariş
- Sepet, adet değiştirme, sipariş talebi (ödeme yok).
- Cari müşteride: iskontolu fiyat, sipariş onaylanınca cariye borç hareketi oluşur.

## Cari hesap (müşteri + admin görünümü)
- Firma bilgileri: adres, telefon, açıklama, iskonto oranı.
- Cari durum: toplam borç, toplam ödeme, bakiye.
- Cari hareketleri: sipariş (borç) ve tahsilat (alacak) kayıtları, tarihli.
- Alınan ürünler listesi, ödeme bilgileri (tarih, tutar, yöntem, not).

## Süper admin paneli
- Ürün / kategori / marka-model yönetimi.
- Kullanıcılar: cari hesap açma, iskonto belirleme.
- Siparişler: durum güncelleme (beklemede, onaylandı, kargolandı, iptal).
- Tahsilat girişi (cariye ödeme kaydı).
- **Stok takibi**: anlık stok, kritik stok uyarısı.
- **Tedarik (alım) kayıtları**: tedarikçi firma, alım tarihi, alış fiyatı, adet — stoğa otomatik eklenir.
- Raporlar: satılan ürünler, satılmayan ürünler, tedarikçi bazlı alımlar.

## Tasarım
- Lacivert Güven paleti (#0f1b3d, #1e3a5f, #3b6fa0, #e8edf3), sade endüstriyel/kurumsal görünüm, Türkçe arayüz.
- Ana sayfa: OEM arama kutusu, kategori ve marka kısayolları.

## Teknik detaylar
- Lovable Cloud: auth (e-posta/şifre), Postgres + RLS.
- Tablolar: profiles, user_roles (admin rolleri ayrı tabloda, has_role fonksiyonu), customer_accounts, categories, brands, vehicle_models, products, product_oem_numbers, product_vehicles (çoka-çok), suppliers, purchases, orders, order_items, account_transactions, payments.
- Stok: alımda artar, sipariş onayında düşer (veritabanı tetikleyicisi).
- Admin sayfaları `_authenticated` altında, rol kontrolü sunucu fonksiyonlarında da yapılır.
- İlk süper admin: ilk kayıt olan hesabınıza rol atanır.
- Örnek kategori, marka ve birkaç ürün veritabanına eklenir.
