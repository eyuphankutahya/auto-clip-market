import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactInput } from "@/lib/contact";
import { submitContact } from "@/lib/contact.functions";

const empty: ContactInput = { name: "", email: "", subject: "", message: "" };

export function ContactForm() {
  const send = useServerFn(submitContact);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = contactSchema.safeParse(values);
    setFailure("");
    setErrors({});
    if (!parsed.success) {
      const next: Partial<Record<keyof ContactInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ContactInput;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setPending(true);
    try {
      await send({ data: parsed.data });
      setSent(true);
      setValues(empty);
    } catch {
      setFailure("Mesajınız gönderilemedi. Lütfen tekrar deneyin; yazdıklarınız korunuyor.");
    } finally {
      setPending(false);
    }
  }

  if (sent) return (
    <section className="mt-10 border-t pt-8" aria-live="polite">
      <CheckCircle2 className="mb-3 h-8 w-8 text-success" />
      <h2 className="text-xl font-bold">Mesajınız alındı</h2>
      <p className="mt-2 text-muted-foreground">KlipsMarket ekibine iletildi.</p>
      <Button className="mt-4" variant="outline" onClick={() => setSent(false)}>Yeni mesaj yaz</Button>
    </section>
  );

  return (
    <section className="mt-10 border-t pt-8">
      <h2 className="text-xl font-bold">Bize yazın</h2>
      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
        <fieldset disabled={pending} className="grid min-w-0 gap-5 sm:grid-cols-2">
          {([{ key: "name", label: "Ad soyad", type: "text", max: 100, auto: "name" }, { key: "email", label: "E-posta", type: "email", max: 255, auto: "email" }] as const).map(({ key, label, type, max, auto }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`contact-${key}`}>{label}</Label>
              <Input id={`contact-${key}`} type={type} autoComplete={auto} required maxLength={max} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `contact-${key}-error` : undefined} />
              {errors[key] && <p id={`contact-${key}-error`} className="text-sm text-destructive">{errors[key]}</p>}
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-subject">Konu</Label>
            <Input id="contact-subject" required maxLength={200} value={values.subject} onChange={(e) => setValues({ ...values, subject: e.target.value })} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "contact-subject-error" : undefined} />
            {errors.subject && <p id="contact-subject-error" className="text-sm text-destructive">{errors.subject}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-message">Mesaj</Label>
            <Textarea id="contact-message" required maxLength={5000} rows={6} className="resize-y" value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} aria-invalid={!!errors.message} aria-describedby={errors.message ? "contact-message-error" : undefined} />
            {errors.message && <p id="contact-message-error" className="text-sm text-destructive">{errors.message}</p>}
          </div>
        </fieldset>
        <p className="text-sm text-muted-foreground">Kişisel verilerinizin işlenmesine ilişkin <Link to="/kvkk" className="text-accent underline">KVKK aydınlatma metni</Link>.</p>
        {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send className="h-4 w-4" />}{pending ? "Gönderiliyor…" : "Mesaj gönder"}</Button>
      </form>
    </section>
  );
}