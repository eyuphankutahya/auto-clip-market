import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Adınızı yazın.").max(100, "Ad en fazla 100 karakter olabilir."),
  email: z.string().trim().email("Geçerli bir e-posta adresi yazın.").max(255, "E-posta en fazla 255 karakter olabilir."),
  subject: z.string().trim().min(1, "Konu yazın.").max(200, "Konu en fazla 200 karakter olabilir."),
  message: z.string().trim().min(1, "Mesajınızı yazın.").max(5000, "Mesaj en fazla 5000 karakter olabilir."),
});

export type ContactInput = z.infer<typeof contactSchema>;