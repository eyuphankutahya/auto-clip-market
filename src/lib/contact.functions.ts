import { createServerFn } from "@tanstack/react-start";
import { contactSchema } from "@/lib/contact";

// Public, insert-only action. Never accepts a recipient, template or database ID.
export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent, error: readError } = await supabaseAdmin.from("contact_submissions").select("email").gte("created_at", since).order("created_at", { ascending: false }).limit(30);
    if (readError) throw new Error("Mesajınız kaydedilemedi. Lütfen tekrar deneyin.");
    if (recent.length >= 30 || recent.filter((message) => message.email.toLowerCase() === email).length >= 3) {
      throw new Error("Çok fazla mesaj gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.");
    }
    const { error } = await supabaseAdmin.from("contact_submissions").insert({ ...data, email });
    if (error) throw new Error("Mesajınız kaydedilemedi. Lütfen tekrar deneyin.");
    return { success: true };
  });
