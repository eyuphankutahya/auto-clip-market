import { createServerFn } from "@tanstack/react-start";
import { contactSchema } from "@/lib/contact";

// Public, insert-only action. Never accepts a recipient, template or database ID.
export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_submissions").insert(data);
    if (error) throw new Error("Mesajınız kaydedilemedi. Lütfen tekrar deneyin.");
    return { success: true };
  });