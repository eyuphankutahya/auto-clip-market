import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Check, CheckCircle2, Loader2, MessageCircle, PackageSearch, Send, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactInput } from "@/lib/contact";
import { submitContact } from "@/lib/contact.functions";

const empty: ContactInput = { name: "", email: "", subject: "", message: "" };
const topics = {
  product: { icon: PackageSearch, label: "Ürün ve uyumluluk", subject: "Ürün ve uyumluluk sorusu", hint: "Varsa KM No veya OEM numarasını, araç markasını ve kullanım yerini belirtin." },
  order: { icon: Truck, label: "Sipariş ve teslimat", subject: "Sipariş ve teslimat sorusu", hint: "Mevcut bir sipariş için sipariş numaranızı ekleyin." },
  bulk: { icon: Building2, label: "Toplu alım ve cari hesap", subject: "Toplu alım veya cari hesap talebi", hint: "Firma adınızı, ürün kodlarını ve yaklaşık alım adedini paylaşın." },
  other: { icon: MessageCircle, label: "Diğer", subject: "", hint: "Size yardımcı olabilmemiz için talebinizi kısaca açıklayın." },
};
type Topic = keyof typeof topics;

export function ContactForm() {
  const send = useServerFn(submitContact);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const messageHint = topic ? topics[topic].hint : null;

  function clearError(field: keyof ContactInput) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function update(field: keyof ContactInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    clearError(field);
  }

  function selectTopic(next: Topic) {
    setValues((current) => {
      if (current.subject.trim() && current.subject !== (topic && topics[topic].subject)) return current;
      return { ...current, subject: topics[next].subject };
    });
    setTopic(next);
    if (topics[next].subject) clearError("subject");
  }

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
      const first = parsed.error.issues[0]?.path[0];
      event.currentTarget.querySelector<HTMLElement>(`#contact-${String(first)}`)?.focus();
      return;
    }
    setPending(true);
    try {
      await send({ data: parsed.data });
      setSent(true);
      setValues(empty);
      setTopic(null);
    } catch {
      setFailure("Mesajınız gönderilemedi. Lütfen tekrar deneyin; yazdıklarınız korunuyor.");
    } finally {
      setPending(false);
    }
  }

  if (sent) return (
    <section className="rounded-xl border bg-card p-6 shadow-sm sm:p-8" role="status">
      <CheckCircle2 aria-hidden="true" className="mb-4 h-8 w-8 text-success" />
      <h2 className="text-2xl font-extrabold">Mesajınız alındı</h2>
      <Button className="mt-5" variant="outline" onClick={() => setSent(false)}>Yeni mesaj yaz</Button>
    </section>
  );

  return (
    <section aria-labelledby="contact-form-heading" className="rounded-xl border bg-card p-5 shadow-sm sm:p-7">
      <h2 id="contact-form-heading" className="text-2xl font-extrabold">Bize yazın</h2>
      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <fieldset className="min-w-0 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Talep türü <span className="font-normal text-muted-foreground">(isteğe bağlı)</span></legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(topics) as Topic[]).map((key) => {
                const { icon: Icon, label } = topics[key];
                return <label key={key} className="relative flex min-w-0">
                  <input type="radio" name="contact-topic" className="peer sr-only" checked={topic === key} onChange={() => selectTopic(key)} />
                  <span className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md border bg-background/50 px-2 py-2 text-sm font-medium hover:bg-secondary peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-default peer-disabled:opacity-60 sm:px-3">
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{label}{topic === key && <Check aria-hidden="true" className="ml-auto hidden h-4 w-4 shrink-0 sm:block" />}
                  </span>
                </label>;
              })}
            </div>
          </fieldset>
          {([{ key: "name", label: "Ad soyad", type: "text", max: 100, auto: "name" }, { key: "email", label: "E-posta", type: "email", max: 255, auto: "email" }] as const).map(({ key, label, type, max, auto }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`contact-${key}`}>{label}</Label>
              <Input className="h-11 bg-background/50 shadow-none" id={`contact-${key}`} type={type} autoComplete={auto} required maxLength={max} value={values[key]} onChange={(e) => update(key, e.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `contact-${key}-error` : undefined} />
              {errors[key] && <p id={`contact-${key}-error`} className="text-sm text-destructive">{errors[key]}</p>}
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-subject">Konu</Label>
            <Input id="contact-subject" className="h-11 bg-background/50 shadow-none" required maxLength={200} placeholder="Talebinizin kısa başlığı" value={values.subject} onChange={(e) => update("subject", e.target.value)} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "contact-subject-error" : undefined} />
            {errors.subject && <p id="contact-subject-error" className="text-sm text-destructive">{errors.subject}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-message">Mesaj</Label>
            {messageHint && <p id="contact-message-hint" className="text-sm text-muted-foreground">{messageHint}</p>}
            <Textarea id="contact-message" required maxLength={5000} rows={4} className="resize-y bg-background/50 shadow-none" value={values.message} onChange={(e) => update("message", e.target.value)} aria-invalid={!!errors.message} aria-describedby={[messageHint && "contact-message-hint", errors.message && "contact-message-error"].filter(Boolean).join(" ") || undefined} />
            {errors.message && <p id="contact-message-error" className="text-sm text-destructive">{errors.message}</p>}
          </div>
        </fieldset>
        {failure && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{failure}</p>}
        <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-muted-foreground">Kişisel verilerinizin işlenmesine ilişkin <Link to="/kvkk" className="font-medium text-primary underline underline-offset-2">KVKK aydınlatma metni</Link>.</p>
          <Button type="submit" size="lg" className="w-full shrink-0 sm:w-auto" disabled={pending}>{pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" className="h-4 w-4" />}{pending ? "Gönderiliyor…" : "Mesaj gönder"}</Button>
        </div>
      </form>
    </section>
  );
}
