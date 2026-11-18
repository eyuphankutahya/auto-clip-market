// Company contact and legal details shown on the contact, legal pages and footer.
// Fields left null show "Bilgi eklenecek" until the owner provides the real value.
export const COMPANY = {
  brand: "KlipsMarket",
  legalName: null as string | null, // Firma unvanı
  address: null as string | null,
  visitAddress: "Yeni Sanayi Sitesi, Şeker Mahallesi, 6174. Sokak No: 15, 38080 Kocasinan/Kayseri" as string | null,
  mapUrl: "https://maps.google.com/maps?ll=38.734016,35.441406&z=18&t=m&hl=tr&gl=TR&mapclient=embed&cid=7420575241799482059" as string | null,
  mapEmbedUrl: "https://maps.google.com/maps?cid=7420575241799482059&ll=38.7340158,35.4414059&hl=tr&z=17&output=embed&iwloc=near" as string | null,
  phone: null as string | null,
  email: null as string | null,
  whatsapp: null as string | null, // international digits only, e.g. "905551112233"
  taxOffice: null as string | null,
  taxNumber: null as string | null,
  mersis: null as string | null,
  hours: null as string | null,
};

export const MISSING = "Bilgi eklenecek";
export const show = (v: string | null) => v ?? MISSING;
export const whatsappUrl = (digits: string, text = "Merhaba, ürünleriniz hakkında bilgi almak istiyorum.") =>
  `https://wa.me/${digits.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
