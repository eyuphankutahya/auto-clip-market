import { createServerFn } from "@tanstack/react-start";
import { contactSchema } from "@/lib/contact";

// Public, insert-only action. Never accepts a recipient, template or database ID.
export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Simple abuse guard: max 3 messages per e-mail in 10 minutes, 30 site-wide.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const [mine, all] = await Promise.all([
      supabaseAdmin.from("contact_submissions").select("id", { count: "exact", head: true }).eq("email", data.email).gte("created_at", since),
      supabaseAdmin.from("contact_submissions").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    if ((mine.count ?? 0) >= 3 || (all.count ?? 0) >= 30) throw new Error("Çok fazla mesaj gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.");
    const { error } = await supabaseAdmin.from("contact_submissions").insert(data);
    if (error) throw new Error("Mesajınız kaydedilemedi. Lütfen tekrar deneyin.");
    return { success: true };
  });